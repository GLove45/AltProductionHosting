"""Sensor ingest pipeline wiring."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import Iterable

from ..data.feature_store import FeatureStore
from ..data.ingestion_pipeline import FeatureWindow, TelemetryIngestor, rollup_features
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "sensor_ingest"})


@dataclass(slots=True)
class IngestPipeline:
    """Coordinates telemetry collection and feature rollups."""

    ingestor: TelemetryIngestor
    sink: FeatureStore
    interval: timedelta

    def pump(self) -> FeatureWindow:
        """Run one ingest cycle and persist the resulting feature window."""

        events = list(self.ingestor.collect())
        window = rollup_features(events, self.interval)
        logger.info(
            "Ingest cycle complete",
            extra={
                "sentinel_context": {
                    "event_count": len(events),
                    "window_seconds": self.interval.total_seconds(),
                }
            },
        )
        self.sink.persist(window)
        return window
