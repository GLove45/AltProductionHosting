"""Coordinator services orchestrating policy, storage, and UI."""

from __future__ import annotations

from datetime import UTC, datetime
from dataclasses import dataclass, field
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
    alerts: List[Alert] = field(default_factory=list)
    last_decision: PolicyDecision | None = None
    last_ingest_latency_ms: float = 0.0

    def evaluate(self, anomaly_scores: Dict[str, float]) -> PolicyDecision:
        """Evaluate current posture and generate an alert if required."""

        decision = self.policy_engine.evaluate(anomaly_scores)
        self.last_decision = decision
        severity = self._map_action_to_severity(decision.action)
        alert = Alert(
            id=f"alert-{len(self.alerts) + 1}",
            timestamp=datetime.now(UTC),
            severity=severity,
            summary=f"Action={decision.action} Confidence={decision.confidence:.2f}",
            rationale=decision.rationale,
            recommendation=(
                decision.playbooks.get(decision.rule_hits[0].tripwire, ["Review"])[0]
                if decision.rule_hits
                else ("Allow" if decision.action == "allow" else "Review")
            ),
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

    def record_ingest_latency(self, latency_ms: float) -> None:
        """Update ingest to UI latency measurements."""

        self.last_ingest_latency_ms = latency_ms
        logger.debug(
            "Latency updated",
            extra={"sentinel_context": {"latency_ms": latency_ms}},
        )

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

    def decision_console(self) -> Dict[str, object]:
        """Return the latest decision context for the UI console."""

        if not self.last_decision:
            return {
                "status": "idle",
                "playbooks": {},
                "requires_approval": False,
                "approval_deadline": None,
            }
        decision = self.last_decision
        console = {
            "status": decision.action,
            "confidence": decision.confidence,
            "playbooks": decision.playbooks,
            "requires_approval": decision.requires_approval,
            "approval_deadline": decision.approval_deadline,
        }
        logger.debug(
            "Decision console snapshot",
            extra={"sentinel_context": console},
        )
        return console

    def suggested_automations(self) -> Dict[str, int]:
        """Expose learning loop suggestions for auto-execution."""

        suggestions = self.feedback_loop.suggested_automations()
        logger.debug(
            "Fetched suggested automations",
            extra={"sentinel_context": {"count": len(suggestions)}},
        )
        return suggestions
