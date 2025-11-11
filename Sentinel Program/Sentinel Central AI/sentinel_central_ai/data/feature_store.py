"""Feature storage primitives."""

from __future__ import annotations

import json
import logging
import sqlite3
from collections import deque
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Deque, Dict, List

from .ingestion_pipeline import FeatureSink, FeatureWindow
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "feature_store"})


def _sqlite_path(dsn: str) -> str:
    """Resolve an sqlite:/// style DSN into a filesystem path."""

    if dsn in {"sqlite:///:memory:", ":memory:"}:
        return ":memory:"
    if dsn.startswith("sqlite:///"):
        return dsn.replace("sqlite:///", "", 1)
    raise ValueError(f"Unsupported SQLite DSN: {dsn}")


def _json_serializer(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.total_seconds()
    return value


@dataclass(slots=True)
class StorageTelemetry:
    """Metadata describing feature persistence actions."""

    engine: str
    dsn: str
    digest_interval: timedelta
    audit_log_path: Path


@dataclass(slots=True)
class FeatureStore(FeatureSink):
    """SQLite-backed feature store with append-only audit trail."""

    storage: StorageTelemetry
    windows: Deque[FeatureWindow] = field(default_factory=lambda: deque(maxlen=512))
    _connection: sqlite3.Connection | None = field(init=False, default=None)
    _db_path: str = field(init=False, default="")

    @classmethod
    def from_config(cls, config) -> "FeatureStore":
        logger.debug(
            "Provisioning FeatureStore",
            extra={
                "sentinel_context": {
                    "engine": config.engine,
                    "dsn": config.dsn,
                    "digest_interval": config.digest_interval.total_seconds(),
                    "audit_log_path": getattr(config, "audit_log_path", "n/a"),
                }
            },
        )
        return cls(
            storage=StorageTelemetry(
                engine=config.engine,
                dsn=config.dsn,
                digest_interval=config.digest_interval,
                audit_log_path=Path(getattr(config, "audit_log_path", "audit.log")),
            )
        )

    def __post_init__(self) -> None:
        if self.storage.engine != "sqlite":  # pragma: no cover - other engines unsupported yet
            raise ValueError(f"Unsupported storage engine: {self.storage.engine}")
        self._db_path = _sqlite_path(self.storage.dsn)
        if self._db_path != ":memory:":
            Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        self.storage.audit_log_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(
            self._db_path,
            detect_types=sqlite3.PARSE_DECLTYPES,
            check_same_thread=False,
        )
        self._connection.execute("PRAGMA journal_mode=WAL;")
        self._connection.execute("PRAGMA synchronous=NORMAL;")
        self._create_schema()
        logger.info(
            "FeatureStore online",
            extra={
                "sentinel_context": {
                    "engine": self.storage.engine,
                    "dsn": self.storage.dsn,
                    "audit_log_path": str(self.storage.audit_log_path),
                }
            },
        )

    def _create_schema(self) -> None:
        assert self._connection is not None
        with self._connection:  # pragma: no branch - schema setup
            self._connection.execute(
                """
                CREATE TABLE IF NOT EXISTS feature_windows (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    label TEXT NOT NULL,
                    window_seconds REAL NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            self._connection.execute(
                """
                CREATE TABLE IF NOT EXISTS feature_values (
                    window_id INTEGER NOT NULL,
                    feature TEXT NOT NULL,
                    value REAL NOT NULL,
                    FOREIGN KEY(window_id) REFERENCES feature_windows(id)
                )
                """
            )

    def persist(self, window: FeatureWindow) -> None:  # noqa: D401
        assert self._connection is not None
        created_at = datetime.now(UTC)
        logger.debug(
            "Persisting feature window",
            extra={
                "sentinel_context": {
                    "duration": window.duration.total_seconds(),
                    "features": window.features,
                    "label": window.label,
                }
            },
        )
        with self._connection:
            cursor = self._connection.execute(
                "INSERT INTO feature_windows(label, window_seconds, created_at) VALUES (?, ?, ?)",
                (window.label, window.duration.total_seconds(), created_at.isoformat()),
            )
            window_id = cursor.lastrowid
            self._connection.executemany(
                "INSERT INTO feature_values(window_id, feature, value) VALUES (?, ?, ?)",
                [(window_id, feature, float(value)) for feature, value in window.features.items()],
            )
        self.windows.append(window)
        self._append_audit_record(window_id, window, created_at)

    def _append_audit_record(self, window_id: int, window: FeatureWindow, created_at: datetime) -> None:
        record = {
            "id": window_id,
            "label": window.label,
            "window_seconds": window.duration.total_seconds(),
            "features": window.features,
            "created_at": created_at,
        }
        line = json.dumps(record, default=_json_serializer)
        with self.storage.audit_log_path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
        logger.debug(
            "Appended audit record",
            extra={"sentinel_context": {"window_id": window_id, "bytes": len(line)}},
        )

    def latest(self, limit: int = 10) -> List[FeatureWindow]:
        """Return the most recent feature windows."""

        items = list(self.windows)[-limit:]
        logger.debug(
            "Retrieved feature windows",
            extra={"sentinel_context": {"requested": limit, "returned": len(items)}},
        )
        return items

    def snapshot(self) -> Dict[str, float]:
        """Produce a consolidated snapshot for UI queries."""

        snapshot: Dict[str, float] = {}
        for window in self.windows:
            for feature, value in window.features.items():
                snapshot[feature] = snapshot.get(feature, 0.0) + value
        logger.debug(
            "Computed feature snapshot",
            extra={"sentinel_context": {"feature_count": len(snapshot)}},
        )
        return snapshot

    def fetch_rollup(self, feature: str) -> List[tuple[datetime, float]]:
        """Return historical values for a single feature for UI timelines."""

        assert self._connection is not None
        cursor = self._connection.execute(
            """
            SELECT fw.created_at, fv.value
            FROM feature_values AS fv
            JOIN feature_windows AS fw ON fw.id = fv.window_id
            WHERE fv.feature = ?
            ORDER BY fw.id DESC
            LIMIT 64
            """,
            (feature,),
        )
        rows = cursor.fetchall()
        result = [(datetime.fromisoformat(ts), float(value)) for ts, value in rows]
        logger.debug(
            "Fetched rollup history",
            extra={"sentinel_context": {"feature": feature, "points": len(result)}},
        )
        return result
