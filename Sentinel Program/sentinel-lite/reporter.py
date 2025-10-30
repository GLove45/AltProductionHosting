"""Reporting utilities for Sentinel Lite."""
from __future__ import annotations

import json
import logging
import queue
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

try:
    import requests
except ImportError:  # pragma: no cover - optional dependency
    requests = None  # type: ignore

try:
    import paramiko
except ImportError:  # pragma: no cover - optional dependency
    paramiko = None  # type: ignore

LOGGER = logging.getLogger("sentinel.reporter")


@dataclass
class ReporterConfig:
    mode: str = "https"  # or "ssh"
    endpoint: Optional[str] = None
    ssh_host: Optional[str] = None
    ssh_username: Optional[str] = None
    ssh_key_path: Optional[str] = None
    local_log_path: str = "logs/sentinel.log"


class Reporter:
    """Send logs to server via SSH or HTTPS webhook."""

    def __init__(self, config: ReporterConfig) -> None:
        self.config = config
        self._queue: "queue.Queue[Dict]" = queue.Queue()
        self._thread: Optional[threading.Thread] = None
        LOGGER.debug("Reporter initialised with config %s", config)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if self._thread:
            self._queue.put(None)  # type: ignore[arg-type]
            self._thread.join()
            self._thread = None

    def submit(self, payload: Dict) -> None:
        LOGGER.info("Queueing alert for delivery: %s", payload)
        self._queue.put(payload)

    def _worker(self) -> None:
        while True:
            payload = self._queue.get()
            if payload is None:
                break
            try:
                if self.config.mode == "https":
                    self._send_https(payload)
                elif self.config.mode == "ssh":
                    self._send_ssh(payload)
                self._append_local_log(payload)
            except Exception:
                LOGGER.exception("Unable to forward payload: %s", payload)

    def _send_https(self, payload: Dict) -> None:
        if requests is None:
            LOGGER.warning("requests not installed; skipping HTTPS submission")
            return
        if not self.config.endpoint:
            raise ValueError("HTTPS endpoint not configured")
        response = requests.post(self.config.endpoint, json=payload, timeout=10)
        response.raise_for_status()

    def _send_ssh(self, payload: Dict) -> None:
        if paramiko is None:
            LOGGER.warning("paramiko not installed; skipping SSH submission")
            return
        if not all([self.config.ssh_host, self.config.ssh_username, self.config.ssh_key_path]):
            raise ValueError("SSH configuration incomplete")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=self.config.ssh_host,
            username=self.config.ssh_username,
            key_filename=self.config.ssh_key_path,
            timeout=10,
        )
        stdin, stdout, stderr = client.exec_command(
            f"cat >> {self.config.endpoint or '~/sentinel.log'}"
        )
        stdin.write(json.dumps(payload) + "\n")
        stdin.flush()
        stdout.channel.shutdown_write()
        client.close()

    def _append_local_log(self, payload: Dict) -> None:
        path = self.config.local_log_path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload) + "\n")


__all__ = ["Reporter", "ReporterConfig"]
