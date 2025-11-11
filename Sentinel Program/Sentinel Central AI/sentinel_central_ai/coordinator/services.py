"""Coordinator services orchestrating policy, storage, and UI."""

from __future__ import annotations

from datetime import UTC, datetime
from dataclasses import dataclass
from typing import Dict, List

from ..config import CoordinatorConfig
from ..policy.engine import PolicyDecision, PolicyEngine
from ..learning.feedback import FeedbackLoop, FeedbackRecord
from ..data.feature_store import FeatureStore
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "coordinator"})


@dataclass(slots=True)
class Alert:
    """Represents an alert routed to the UI and phone app."""

    id: str
    timestamp: datetime
    severity: str
    summary: str
    rationale: str
    recommendation: str


@dataclass(slots=True)
class Coordinator:
    """Core coordinator service for Sentinel Central AI."""

    config: CoordinatorConfig
    policy_engine: PolicyEngine
    feedback_loop: FeedbackLoop
    feature_store: FeatureStore
    alerts: List[Alert] = None

    def __post_init__(self) -> None:
        self.alerts = []

    def evaluate(self, anomaly_scores: Dict[str, float]) -> PolicyDecision:
        """Evaluate current posture and generate an alert if required."""

        decision = self.policy_engine.evaluate(anomaly_scores)
        severity = self._map_action_to_severity(decision.action)
        alert = Alert(
            id=f"alert-{len(self.alerts) + 1}",
            timestamp=datetime.now(UTC),
            severity=severity,
            summary=f"Action={decision.action} Confidence={decision.confidence:.2f}",
            rationale=decision.rationale,
            recommendation="Require Elevated" if decision.action != "allow" else "Allow",
        )
        self.alerts.append(alert)
        logger.info(
            "Coordinator generated alert",
            extra={
                "sentinel_context": {
                    "alert_id": alert.id,
                    "severity": alert.severity,
                    "recommendation": alert.recommendation,
                }
            },
        )
        return decision

    def log_feedback(self, record: FeedbackRecord) -> None:
        """Store operator feedback and propagate to the learning loop."""

        self.feedback_loop.record(record)

    def _map_action_to_severity(self, action: str) -> str:
        mapping = {
            "allow": "info",
            "require_elevated": "medium",
            "quarantine": "high",
            "lockdown": "critical",
        }
        return mapping.get(action, "unknown")

    def latest_alerts(self, limit: int = 5) -> List[Alert]:
        """Return the most recent alerts."""

        alerts = self.alerts[-limit:]
        logger.debug(
            "Retrieved alerts",
            extra={"sentinel_context": {"requested": limit, "returned": len(alerts)}},
        )
        return alerts
