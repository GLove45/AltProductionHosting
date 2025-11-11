"""Telemetry ingestion pipeline definitions."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from dataclasses import dataclass
from typing import Dict, Iterable, Iterator, List

from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "telemetry_ingestion"})


@dataclass(slots=True)
class TelemetryEvent:
    """Normalized representation of raw telemetry records."""

    source: str
    payload: Dict[str, object]
    collected_at: datetime


@dataclass(slots=True)
class TelemetryIngestor:
    """Loads raw telemetry from configured sources at strict cadence."""

    sources: List[str]
    cadence_seconds: int

    @classmethod
    def from_config(cls, config) -> "TelemetryIngestor":
        logger.debug(
            "Creating TelemetryIngestor from config",
            extra={"sentinel_context": {"sources": config.sources, "cadence": config.cadence_seconds}},
        )
        return cls(sources=config.sources, cadence_seconds=config.cadence_seconds)

    def collect(self) -> Iterator[TelemetryEvent]:
        """Yield placeholder telemetry events for every configured source."""

        now = datetime.now(UTC)
        for source in self.sources:
            event = TelemetryEvent(source=source, payload={"status": "pending"}, collected_at=now)
            logger.debug(
                "Collected telemetry",
                extra={"sentinel_context": {"source": source, "ts": now.isoformat()}},
            )
            yield event


@dataclass(slots=True)
class FeatureWindow:
    """Windowed feature summaries derived from raw telemetry."""

    duration: timedelta
    features: Dict[str, float]
    label: str


class FeatureSink:
    """Protocol-like interface for persisting feature windows."""

    def persist(self, window: FeatureWindow) -> None:  # pragma: no cover - interface
        raise NotImplementedError


def rollup_features(events: Iterable[TelemetryEvent], window: timedelta) -> FeatureWindow:
    """Create a feature window with synthetic metrics for scaffolding."""

    counts = {event.source: 1.0 for event in events}
    logger.debug(
        "Rolled up features",
        extra={"sentinel_context": {"window_seconds": window.total_seconds(), "counts": counts}},
    )
    return FeatureWindow(duration=window, features=counts, label="synthetic")
