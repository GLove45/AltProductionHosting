"""Command line interface for Sentinel Lite."""
from __future__ import annotations

import argparse
import configparser
import logging
import signal
import sys
import threading
from pathlib import Path
from typing import List

from integrity import IntegrityConfig, IntegrityVerifier
from netwatch import NetWatcher, NetWatcherConfig
from procguard import ProcGuard, ProcGuardConfig
from reporter import Reporter, ReporterConfig

LOG_PATH = Path(__file__).resolve().parent / "logs" / "sentinel.log"
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler(LOG_PATH)],
)
LOGGER = logging.getLogger("sentinel.cli")


class SentinelRuntime:
    """Coordinates all Sentinel Lite components."""

    def __init__(self, config_root: Path) -> None:
        self.config_root = config_root
        self._stop_event = threading.Event()
        self.config = self._load_config()
        self.reporter = Reporter(self._build_reporter_config())
        self.netwatcher = self._build_netwatch()
        self.procguard = self._build_procguard()
        self.integrity = self._build_integrity()
        self._threads: List[threading.Thread] = []

    # ------------------------------------------------------------------
    # Configuration helpers
    # ------------------------------------------------------------------
    def _load_config(self) -> configparser.ConfigParser:
        parser = configparser.ConfigParser()
        conf_path = self.config_root / "sentinel.conf"
        if conf_path.exists():
            parser.read(conf_path)
        return parser

    def _build_reporter_config(self) -> ReporterConfig:
        section = self.config["reporting"] if self.config.has_section("reporting") else None
        mode = section.get("mode", "https") if section else "https"
        endpoint = section.get("endpoint") if section else None
        local_log_path = section.get("local_log_path", str(LOG_PATH)) if section else str(LOG_PATH)
        if section and not Path(local_log_path).is_absolute():
            local_log_path = str(self.config_root / local_log_path)
        config = ReporterConfig(mode=mode, endpoint=endpoint, local_log_path=local_log_path)
        if mode == "ssh" and section:
            config.ssh_host = section.get("ssh_host")
            config.ssh_username = section.get("ssh_username")
            config.ssh_key_path = section.get("ssh_key_path")
        return config

    def _build_netwatch(self) -> NetWatcher:
        section = self.config["network"] if self.config.has_section("network") else None
        vpn_interface = section.get("vpn_interface", "tun0") if section else "tun0"
        allowlist_raw = section.get("allowlist", "") if section else ""
        allowlist = {item.strip() for item in allowlist_raw.split(",") if item.strip()}
        return NetWatcher(
            NetWatcherConfig(
                vpn_interface=vpn_interface,
                allowlisted_remote_ips=allowlist,
            )
        )

    def _build_procguard(self) -> ProcGuard:
        section = self.config["procguard"] if self.config.has_section("procguard") else None
        critical_files = []
        manifest = self.config_root / "hash_manifest.json"
        if section:
            critical_files = [
                Path(path.strip())
                for path in section.get("critical_paths", "").split(",")
                if path.strip()
            ]
            manifest = Path(section.get("manifest", str(manifest)))
            if not manifest.is_absolute():
                manifest = self.config_root / manifest
        config = ProcGuardConfig(
            critical_paths=critical_files,
            manifest_path=manifest,
        )
        guard = ProcGuard(config)
        guard.refresh_baseline()
        return guard

    def _build_integrity(self) -> IntegrityVerifier:
        section = self.config["integrity"] if self.config.has_section("integrity") else None
        manifest = self.config_root / "manifest.json"
        interval = 600
        if section:
            manifest = Path(section.get("manifest", str(manifest)))
            if not manifest.is_absolute():
                manifest = self.config_root / manifest
            interval = section.getint("interval", fallback=600)
        config = IntegrityConfig(manifest_path=manifest, interval_seconds=interval)
        return IntegrityVerifier(config)

    # ------------------------------------------------------------------
    # Runtime controls
    # ------------------------------------------------------------------
    def start(self) -> None:
        LOGGER.info("Starting Sentinel runtime")
        self._stop_event.clear()
        self._threads = []
        self.reporter.start()
        self.procguard.start_watchdog(self.reporter.submit)

        net_thread = threading.Thread(target=self._poll_network, daemon=True)
        net_thread.start()
        self._threads.append(net_thread)

        proc_thread = threading.Thread(target=self._poll_procguard, daemon=True)
        proc_thread.start()
        self._threads.append(proc_thread)

        integ_thread = threading.Thread(
            target=self.integrity.run_forever,
            args=(self.reporter.submit,),
            daemon=True,
        )
        integ_thread.start()
        self._threads.append(integ_thread)

        def handle_signal(signum, frame):
            LOGGER.info("Received signal %s; shutting down", signum)
            self.stop()

        signal.signal(signal.SIGTERM, handle_signal)
        signal.signal(signal.SIGINT, handle_signal)

        for thread in self._threads:
            thread.join()

    def stop(self) -> None:
        LOGGER.info("Stopping Sentinel runtime")
        self.reporter.stop()
        self.procguard.stop_watchdog()
        self._stop_event.set()

    def _poll_network(self) -> None:
        while not self._stop_event.is_set():
            for alert in self.netwatcher.scan_connections():
                self.reporter.submit(alert)
            self._stop_event.wait(30)

    def _poll_procguard(self) -> None:
        while not self._stop_event.is_set():
            for alert in self.procguard.compare():
                self.reporter.submit(alert)
            self._stop_event.wait(60)


# ----------------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------------

def _cmd_start(args) -> None:
    runtime = SentinelRuntime(Path(args.config_root))
    runtime.start()


def _cmd_force_scan(args) -> None:
    runtime = SentinelRuntime(Path(args.config_root))
    runtime.reporter.start()
    runtime.reporter.submit({"type": "info", "status": "force_scan_started"})
    runtime.reporter.submit({"type": "network", "results": runtime.netwatcher.scan_connections()})
    runtime.reporter.submit({"type": "process", "results": runtime.procguard.compare()})
    runtime.reporter.submit({"type": "integrity", "results": list(runtime.integrity.verify_once())})
    runtime.reporter.stop()


def _cmd_status(args) -> None:
    log_path = Path(args.log or LOG_PATH)
    if not log_path.exists():
        print("No log file available", file=sys.stderr)
        return
    for line in log_path.read_text().splitlines()[-20:]:
        print(line)


def _cmd_report(args) -> None:
    runtime = SentinelRuntime(Path(args.config_root))
    runtime.reporter.start()
    runtime.reporter.submit({"type": "info", "status": "report_requested"})
    runtime.reporter.stop()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sentinel Lite control tool")
    parser.add_argument(
        "--config-root",
        default=str(Path(__file__).resolve().parent),
        help="Path to sentinel configuration root",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    cmd_start = sub.add_parser("start", help="Start Sentinel Lite service")
    cmd_start.set_defaults(func=_cmd_start)

    cmd_force = sub.add_parser("force-scan", help="Run all checks once and exit")
    cmd_force.set_defaults(func=_cmd_force_scan)

    cmd_status = sub.add_parser("status", help="Show tail of Sentinel log")
    cmd_status.add_argument("--log", help="Path to log file")
    cmd_status.set_defaults(func=_cmd_status)

    cmd_report = sub.add_parser("report", help="Send an info report")
    cmd_report.set_defaults(func=_cmd_report)

    return parser


def main(argv: List[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
