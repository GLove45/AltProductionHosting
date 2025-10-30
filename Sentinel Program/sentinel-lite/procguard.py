"""Process guarding utilities for Sentinel Lite.

Watches a list of critical executables and compares their SHA-256 hashes
against a baseline. When a deviation is observed an alert dictionary is
returned so :mod:`reporter` can forward the event.
"""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional

try:
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers import Observer
except ImportError:  # pragma: no cover - optional dependency
    FileSystemEventHandler = object  # type: ignore
    Observer = None  # type: ignore

LOGGER = logging.getLogger("sentinel.procguard")


@dataclass
class ProcGuardConfig:
    critical_paths: List[Path] = field(default_factory=list)
    manifest_path: Path = Path("hash_manifest.json")


class HashBaseline:
    """Helper object for storing and updating baseline hashes."""

    def __init__(self, manifest_path: Path) -> None:
        self.manifest_path = manifest_path
        self._hashes: Dict[str, str] = {}
        self._load()

    def _load(self) -> None:
        if self.manifest_path.exists():
            try:
                self._hashes = json.loads(self.manifest_path.read_text())
            except json.JSONDecodeError:
                LOGGER.warning("Manifest corrupted; starting with empty baseline")
                self._hashes = {}

    def save(self) -> None:
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.manifest_path.write_text(json.dumps(self._hashes, indent=2, sort_keys=True))

    def get(self, path: Path) -> Optional[str]:
        return self._hashes.get(str(path))

    def set(self, path: Path, digest: str) -> None:
        self._hashes[str(path)] = digest

    def items(self):
        return self._hashes.items()


class ProcGuard:
    """Hash critical executables and watch for changes."""

    def __init__(self, config: ProcGuardConfig) -> None:
        self.config = config
        self.baseline = HashBaseline(config.manifest_path)
        self._observer: Optional[Observer] = None

    def compute_hash(self, path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as file:
            for chunk in iter(lambda: file.read(8192), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def refresh_baseline(self) -> None:
        for path in self.config.critical_paths:
            if path.exists():
                self.baseline.set(path, self.compute_hash(path))
        self.baseline.save()

    def compare(self) -> Iterable[dict]:
        alerts = []
        for path in self.config.critical_paths:
            if not path.exists():
                continue
            actual = self.compute_hash(path)
            expected = self.baseline.get(path)
            if expected is None:
                self.baseline.set(path, actual)
                continue
            if actual != expected:
                alert = {
                    "type": "process",
                    "path": str(path),
                    "expected": expected,
                    "actual": actual,
                    "status": "hash_mismatch",
                }
                LOGGER.debug("Hash mismatch detected for %s", path)
                alerts.append(alert)
        if alerts:
            self.baseline.save()
        return alerts

    # ---------------------------- Watchdog support ----------------------------
    def start_watchdog(self, callback) -> None:
        if Observer is None:
            LOGGER.warning("watchdog not available; cannot enable realtime monitoring")
            return

        class Handler(FileSystemEventHandler):
            def on_modified(self, event):  # type: ignore[override]
                if not event.is_directory and Path(event.src_path) in self.config.critical_paths:
                    LOGGER.info("Realtime hash alert triggered for %s", event.src_path)
                    for alert in self.compare():
                        callback(alert)

        observer = Observer()
        for critical in self.config.critical_paths:
            target = critical.parent
            if not target.exists():
                LOGGER.warning("Cannot watch %s; parent directory missing", target)
                continue
            observer.schedule(Handler(), path=str(target), recursive=False)
        observer.start()
        self._observer = observer

    def stop_watchdog(self) -> None:
        if self._observer:
            self._observer.stop()
            self._observer.join()
            self._observer = None


__all__ = ["ProcGuard", "ProcGuardConfig"]
