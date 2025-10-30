"""Network monitoring for Sentinel Lite.

This module inspects outbound connections using psutil and flags any
connection that is not routed through the configured VPN interface or
outside an allowlist of remote endpoints.

Example usage:
    from netwatch import NetWatcher
    watcher = NetWatcher()
    for alert in watcher.scan_connections():
        print(alert)
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
from dataclasses import dataclass, field
from typing import Iterable, List, Optional, Set

try:
    import psutil
except ImportError:  # pragma: no cover - handled gracefully in runtime
    psutil = None  # type: ignore

try:  # scapy is optional; we use it only when available.
    from scapy.all import conf as scapy_conf  # type: ignore
except Exception:  # pragma: no cover - scapy may not be installed
    scapy_conf = None

LOGGER = logging.getLogger("sentinel.netwatch")


@dataclass
class NetWatcherConfig:
    """Runtime configuration for :class:`NetWatcher`."""

    vpn_interface: str = "tun0"
    allowlisted_remote_ips: Set[str] = field(default_factory=set)
    nordvpn_binary: str = "nordvpn"


class NetWatcher:
    """Monitor outbound connections and flag anomalies."""

    def __init__(self, config: Optional[NetWatcherConfig] = None) -> None:
        if config is None:
            config = self._load_config_from_env()
        self.config = config
        LOGGER.debug("NetWatcher initialised with config: %s", self.config)

    def _load_config_from_env(self) -> NetWatcherConfig:
        allowlist_raw = os.environ.get("SENTINEL_ALLOWLIST", "")
        allowlisted_remote_ips = {
            part.strip()
            for part in allowlist_raw.split(",")
            if part.strip()
        }
        vpn_interface = os.environ.get("SENTINEL_VPN_INTERFACE", "tun0")
        nordvpn_binary = os.environ.get("SENTINEL_NORDVPN_BIN", "nordvpn")
        return NetWatcherConfig(
            vpn_interface=vpn_interface,
            allowlisted_remote_ips=allowlisted_remote_ips,
            nordvpn_binary=nordvpn_binary,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def scan_connections(self) -> Iterable[dict]:
        """Yield alerts for connections that violate VPN policy.

        Returns dictionaries that can be forwarded to :mod:`reporter`.
        """

        LOGGER.debug("Starting connection scan")
        vpn_ip = self._discover_vpn_ip()
        LOGGER.debug("Active VPN IP: %s", vpn_ip)

        if psutil is None:
            LOGGER.warning("psutil not installed; skipping network scan")
            return []

        suspicious: List[dict] = []
        for conn in psutil.net_connections(kind="inet"):
            if not conn.raddr:
                continue
            remote_ip = self._extract_ip(conn.raddr)
            local_ip = self._extract_ip(conn.laddr)
            if self._is_suspicious(local_ip, remote_ip, vpn_ip):
                alert = self._format_alert(conn, vpn_ip)
                LOGGER.debug("Suspicious connection found: %s", alert)
                suspicious.append(alert)
        return suspicious

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _extract_ip(self, endpoint) -> str:
        if hasattr(endpoint, 'ip'):
            return getattr(endpoint, 'ip', 'unknown')
        if isinstance(endpoint, tuple) and endpoint:
            return endpoint[0]
        return str(endpoint)

    def _discover_vpn_ip(self) -> Optional[str]:
        """Attempt to detect the VPN IP via nordvpn or scapy."""

        try:
            result = subprocess.run(
                [self.config.nordvpn_binary, "status", "--output", "json"],
                capture_output=True,
                check=True,
                text=True,
            )
            payload = json.loads(result.stdout)
            return payload.get("ip")
        except (FileNotFoundError, subprocess.CalledProcessError, json.JSONDecodeError):
            LOGGER.debug("Falling back to scapy for VPN detection", exc_info=True)

        if scapy_conf and getattr(scapy_conf, "route", None):
            try:
                vpn_route = next(
                    (
                        row
                        for row in scapy_conf.route.routes
                        if row[2] == self.config.vpn_interface
                    ),
                    None,
                )
                if vpn_route:
                    return vpn_route[3]
            except Exception:  # pragma: no cover - defensive fallback
                LOGGER.exception("Unable to infer VPN IP from scapy")
        return None

    def _is_suspicious(self, local_ip: str, remote_ip: str, vpn_ip: Optional[str]) -> bool:
        if remote_ip in self.config.allowlisted_remote_ips:
            return False
        if vpn_ip and remote_ip == vpn_ip:
            return False
        if local_ip and local_ip.startswith("127."):
            return False
        return True

    def _format_alert(self, conn, vpn_ip: Optional[str]) -> dict:
        alert = {
            "type": "network",
            "local": self._extract_ip(conn.laddr),
            "remote": self._extract_ip(conn.raddr),
            "status": "outside_vpn",
            "vpn_ip": vpn_ip,
        }
        return alert


__all__ = ["NetWatcher", "NetWatcherConfig"]
