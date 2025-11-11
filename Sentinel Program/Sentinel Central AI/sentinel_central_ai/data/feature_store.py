"""Feature storage primitives."""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Deque, Dict, Iterable, List

from .ingestion_pipeline import FeatureSink, FeatureWindow
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "feature_store"})


@dataclass(slots=True)
class StorageTelemetry:
    """Metadata describing feature persistence actions."""

    engine: str
    dsn: str
    digest_interval: timedelta


@dataclass(slots=True)
class FeatureStore(FeatureSink):
    """In-memory feature store with verbose logging for day-zero tests."""

    storage: StorageTelemetry
    windows: Deque[FeatureWindow] = field(default_factory=lambda: deque(maxlen=512))

    @classmethod
    def from_config(cls, config) -> "FeatureStore":
        logger.debug(
            "Provisioning FeatureStore",
            extra={
                "sentinel_context": {
                    "engine": config.engine,
                    "dsn": config.dsn,
                    "digest_interval": config.digest_interval.total_seconds(),
                }
            },
        )
        return cls(
            storage=StorageTelemetry(
                engine=config.engine,
                dsn=config.dsn,
                digest_interval=config.digest_interval,
            )
        )

    def persist(self, window: FeatureWindow) -> None:  # noqa: D401
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
        self.windows.append(window)

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
