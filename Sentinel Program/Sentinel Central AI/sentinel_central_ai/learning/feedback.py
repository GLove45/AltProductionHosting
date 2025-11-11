"""Human-in-the-loop feedback scaffolding."""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import DefaultDict, Dict, List

from ..config import PolicyThresholds
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "feedback_loop"})


@dataclass(slots=True)
class FeedbackRecord:
    """Represents a single human decision within the UI."""

    decision_id: str
    actor: str
    verdict: str
    rationale: str
    timestamp: datetime
    feature_vector: Dict[str, float]
    rule_hits: List[str]
    action: str | None = None
    source_ip: str | None = None
    outcome: str | None = None


@dataclass(slots=True)
class TrustState:
    """Maintains Bayesian trust scores for actions and indicators."""

    approvals: int = 0
    denials: int = 0

    def update(self, approved: bool) -> None:
        if approved:
            self.approvals += 1
        else:
            self.denials += 1

    @property
    def score(self) -> float:
        total = self.approvals + self.denials + 2
        return (self.approvals + 1) / total


@dataclass(slots=True)
class FeedbackLoop:
    """Captures operator decisions and produces promotion suggestions."""

    window_sizes: List[timedelta]
    history: List[FeedbackRecord] = field(default_factory=list)
    approvals: DefaultDict[str, int] = field(default_factory=lambda: defaultdict(int))
    trust: DefaultDict[str, TrustState] = field(default_factory=lambda: defaultdict(TrustState))
    baseline: Dict[str, float] = field(default_factory=dict)
    drift_flags: Dict[str, datetime] = field(default_factory=dict)

    def record(self, record: FeedbackRecord) -> None:
        """Persist a new feedback record and update approval counts."""

        logger.info(
            "Recording feedback",
            extra={
                "sentinel_context": {
                    "decision_id": record.decision_id,
                    "verdict": record.verdict,
                    "actor": record.actor,
                }
            },
        )
        self.history.append(record)
        key = f"{record.verdict}:{record.rationale}"
        self.approvals[key] += 1
        approved = record.verdict.lower() in {"allow", "approved", "approve", "require_elevated"}
        action_key = f"action:{record.action or record.verdict}"
        self.trust[action_key].update(approved)
        for rule in record.rule_hits or ["anomaly"]:
            self.trust[f"indicator:{rule}"].update(approved)
        source = record.source_ip or str(record.feature_vector.get("source_ip", "unknown"))
        self.trust[f"source:{source}"].update(approved)
        self._update_baseline(record)
        logger.debug(
            "Updated approvals",
            extra={
                "sentinel_context": {
                    "key": key,
                    "count": self.approvals[key],
                    "action_score": self.trust[action_key].score,
                }
            },
        )

    def _update_baseline(self, record: FeedbackRecord) -> None:
        for feature, value in record.feature_vector.items():
            value = float(value)
            if feature not in self.baseline:
                self.baseline[feature] = value
                continue
            previous = self.baseline[feature]
            ema = previous * 0.9 + value * 0.1
            self.baseline[feature] = ema
            if previous:
                delta = abs(value - previous) / max(abs(previous), 1.0)
                if delta > 0.5:
                    self.drift_flags[feature] = record.timestamp
                    logger.warning(
                        "Baseline drift detected",
                        extra={
                            "sentinel_context": {
                                "feature": feature,
                                "delta": delta,
                                "timestamp": record.timestamp.isoformat(),
                            }
                        },
                    )

    def auto_resolution_rate(self) -> float:
        approvals = sum(state.approvals for state in self.trust.values())
        denials = sum(state.denials for state in self.trust.values())
        total = approvals + denials
        if total == 0:
            return 0.0
        return approvals / total

    def drift_alerts(self, horizon: timedelta = timedelta(minutes=10)) -> Dict[str, datetime]:
        now = datetime.now(UTC)
        return {
            feature: ts
            for feature, ts in self.drift_flags.items()
            if now - ts <= horizon
        }

    def suggested_automations(self, minimum: int = 3, threshold: float = 0.7) -> Dict[str, int]:
        """Return actions eligible for auto-execution promotion."""

        ready: Dict[str, int] = {}
        for key, state in self.trust.items():
            if not key.startswith("action:"):
                continue
            if state.approvals >= minimum and state.score >= threshold:
                ready[key] = state.approvals
        logger.debug(
            "Computed suggested automations",
            extra={
                "sentinel_context": {
                    "minimum": minimum,
                    "threshold": threshold,
                    "ready": ready,
                }
            },
        )
        return ready

    def suggestions(self, minimum: int = 3) -> Dict[str, int]:
        """Backward compatible wrapper for automation suggestions."""

        return self.suggested_automations(minimum=minimum)

    def tune_thresholds(self, thresholds: PolicyThresholds) -> PolicyThresholds:
        """Return adjusted policy thresholds based on operator feedback."""

        auto_rate = self.auto_resolution_rate()
        adjusted = PolicyThresholds(
            require_elevated=thresholds.require_elevated,
            quarantine=thresholds.quarantine,
            lockdown=thresholds.lockdown,
        )
        if auto_rate >= 0.7:
            adjusted.require_elevated = min(0.9, thresholds.require_elevated + 0.05)
            adjusted.quarantine = min(0.95, thresholds.quarantine + 0.02)
        else:
            adjusted.require_elevated = max(0.3, thresholds.require_elevated - 0.05)
        if self.drift_alerts():
            adjusted.require_elevated = max(0.2, adjusted.require_elevated - 0.1)
            adjusted.quarantine = max(0.4, adjusted.quarantine - 0.05)
        logger.debug(
            "Thresholds tuned",
            extra={
                "sentinel_context": {
                    "auto_rate": auto_rate,
                    "updated": {
                        "require_elevated": adjusted.require_elevated,
                        "quarantine": adjusted.quarantine,
                        "lockdown": adjusted.lockdown,
                    },
                }
            },
        )
        return adjusted
