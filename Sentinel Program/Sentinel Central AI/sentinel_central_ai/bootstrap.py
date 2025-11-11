"""Bootstrap routines for orchestrating the Sentinel Central AI infrastructure."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable

from .config import SentinelConfig
from .coordinator.services import Coordinator
from .learning.feedback import FeedbackLoop
from .policy.engine import PolicyEngine
from .rules.engine import RuleEngine
from .sensor.ingest import IngestPipeline
from .sensor.inference import InferenceEngine
from .data.ingestion_pipeline import TelemetryIngestor
from .data.feature_store import FeatureStore
from .ui.dashboard import Dashboard
from .utils.logging_config import configure_logging


@dataclass(slots=True)
class BootstrapContext:
    """Aggregates the primary runtime components for downstream wiring."""

    ingest_pipeline: IngestPipeline
    inference_engine: InferenceEngine
    rule_engine: RuleEngine
    policy_engine: PolicyEngine
    feedback_loop: FeedbackLoop
    coordinator: Coordinator
    dashboard: Dashboard


def _announce_components(logger: logging.Logger, context: BootstrapContext) -> None:
    """Emit a verbose summary of all components currently loaded."""

    components: Iterable[tuple[str, object]] = (
        ("ingest_pipeline", context.ingest_pipeline),
        ("inference_engine", context.inference_engine),
        ("rule_engine", context.rule_engine),
        ("policy_engine", context.policy_engine),
        ("feedback_loop", context.feedback_loop),
        ("coordinator", context.coordinator),
        ("dashboard", context.dashboard),
    )
    for name, component in components:
        logger.info(
            "Component initialized",
            extra={
                "sentinel_context": {
                    "component": name,
                    "class": component.__class__.__name__,
                }
            },
        )


def bootstrap_environment(config: SentinelConfig | None = None) -> BootstrapContext:
    """Create and connect the core Sentinel Central AI components.

    The bootstrap routine emits high-fidelity logs describing each stage so day-zero
    bring-up on the Pi nodes is completely traceable.
    """

    logger = configure_logging(context={"phase": "bootstrap"})
    config = config or SentinelConfig.default()

    logger.debug(
        "Loading Sentinel configuration",
        extra={
            "sentinel_context": {
                "phase": "config",
                "coordinator": config.coordinator.host,
                "sensor": config.sensor.host,
            }
        },
    )

    feature_store = FeatureStore.from_config(config.storage)
    ingest_pipeline = IngestPipeline(
        TelemetryIngestor.from_config(config.sensor.telemetry),
        feature_store,
        config.sensor.ingest_interval,
    )
    inference_engine = InferenceEngine(
        feature_store=feature_store,
        batch_interval=config.sensor.inference.batch_interval,
        accelerator_profile=config.sensor.inference.accelerator_profile,
    )
    rule_engine = RuleEngine.from_config(config.policy.rules)
    policy_engine = PolicyEngine(rule_engine=rule_engine, thresholds=config.policy.thresholds)
    feedback_loop = FeedbackLoop(window_sizes=config.learning.windows)
    coordinator = Coordinator(
        config=config.coordinator,
        policy_engine=policy_engine,
        feedback_loop=feedback_loop,
        feature_store=feature_store,
    )
    dashboard = Dashboard(coordinator=coordinator)

    context = BootstrapContext(
        ingest_pipeline=ingest_pipeline,
        inference_engine=inference_engine,
        rule_engine=rule_engine,
        policy_engine=policy_engine,
        feedback_loop=feedback_loop,
        coordinator=coordinator,
        dashboard=dashboard,
    )

    _announce_components(logger, context)

    logger.info(
        "Sentinel Central AI bootstrap complete",
        extra={
            "sentinel_context": {
                "coordinator_mode": config.policy.mode,
                "ui_endpoint": config.coordinator.ui_endpoint,
            }
        },
    )
    return context
