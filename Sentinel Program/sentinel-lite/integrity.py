"""Integrity verification routines for Sentinel Lite."""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

import hashlib

LOGGER = logging.getLogger("sentinel.integrity")


@dataclass
class IntegrityConfig:
    manifest_path: Path
    interval_seconds: int = 600


class IntegrityVerifier:
    """Verify checksums of key config files."""

    def __init__(self, config: IntegrityConfig) -> None:
        self.config = config
        self.manifest = self._load_manifest()

    def _load_manifest(self) -> Dict[str, str]:
        if not self.config.manifest_path.exists():
            raise FileNotFoundError(
                f"Manifest file {self.config.manifest_path} does not exist"
            )
        return json.loads(self.config.manifest_path.read_text())

    def _hash_file(self, path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(8192), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def verify_once(self) -> Iterable[dict]:
        alerts: List[dict] = []
        for filename, expected_hash in self.manifest.items():
            path = Path(filename)
            if not path.exists():
                alerts.append(
                    {
                        "type": "integrity",
                        "status": "missing",
                        "path": filename,
                    }
                )
                continue
            actual_hash = self._hash_file(path)
            if not expected_hash:
                LOGGER.debug("Manifest entry for %s missing hash; skipping comparison", filename)
                continue
            if actual_hash != expected_hash:
                alerts.append(
                    {
                        "type": "integrity",
                        "status": "checksum_mismatch",
                        "path": filename,
                        "expected": expected_hash,
                        "actual": actual_hash,
                    }
                )
        return alerts

    def run_forever(self, callback) -> None:
        LOGGER.info(
            "Integrity verifier running every %s seconds", self.config.interval_seconds
        )
        while True:
            for alert in self.verify_once():
                callback(alert)
            time.sleep(self.config.interval_seconds)


__all__ = ["IntegrityVerifier", "IntegrityConfig"]
