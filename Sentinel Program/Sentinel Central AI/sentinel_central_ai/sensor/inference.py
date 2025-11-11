"""Inference orchestration on the sensor node."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from dataclasses import dataclass
from typing import Dict

from ..data.feature_store import FeatureStore
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "sensor_inference"})


@dataclass(slots=True)
class InferenceBatch:
    """Container describing a batch scored on the accelerator."""

    started_at: datetime
    completed_at: datetime
    feature_count: int
    scores: Dict[str, float]


@dataclass(slots=True)
class InferenceEngine:
    """Coordinates scoring workloads on the AI HAT."""

    feature_store: FeatureStore
    batch_interval: timedelta
    accelerator_profile: Dict[str, str]

    def score(self) -> InferenceBatch:
        """Simulate scoring of the latest feature snapshot."""

        start = datetime.now(UTC)
        features = self.feature_store.snapshot()
        scores = {feature: value * 0.1 for feature, value in features.items()}
        batch = InferenceBatch(
            started_at=start,
            completed_at=datetime.now(UTC),
            feature_count=len(features),
            scores=scores,
        )
        logger.info(
            "Inference batch complete",
            extra={
                "sentinel_context": {
                    "feature_count": batch.feature_count,
                    "duration_ms": (batch.completed_at - batch.started_at).total_seconds() * 1000,
                    "accelerator": self.accelerator_profile,
                }
            },
        )
        return batch
