"""Policy engine that merges rule hits and anomaly scores."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List

from ..config import PolicyThresholds
from ..rules.engine import RuleEngine, RuleHit
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "policy_engine"})


@dataclass(slots=True)
class PolicyDecision:
    """Outcome of policy evaluation."""

    action: str
    confidence: float
    rationale: str
    rule_hits: List[RuleHit]
    anomaly_scores: Dict[str, float]


@dataclass(slots=True)
class PolicyEngine:
    """Combines deterministic rules and anomaly scores into an action."""

    rule_engine: RuleEngine
    thresholds: PolicyThresholds

    def evaluate(self, anomaly_scores: Dict[str, float]) -> PolicyDecision:
        """Compute the final policy action."""

        features = {**anomaly_scores}
        rule_hits = self.rule_engine.evaluate(features)
        max_score = max([hit.score for hit in rule_hits] + list(anomaly_scores.values()) or [0.0])
        if max_score >= self.thresholds.lockdown:
            action = "lockdown"
        elif max_score >= self.thresholds.quarantine:
            action = "quarantine"
        elif max_score >= self.thresholds.require_elevated:
            action = "require_elevated"
        else:
            action = "allow"
        rationale = (
            f"Max score {max_score:.2f} across rules/anomalies; thresholds="
            f"(elevated={self.thresholds.require_elevated}, "
            f"quarantine={self.thresholds.quarantine}, "
            f"lockdown={self.thresholds.lockdown})"
        )
        decision = PolicyDecision(
            action=action,
            confidence=max_score,
            rationale=rationale,
            rule_hits=rule_hits,
            anomaly_scores=anomaly_scores,
        )
        logger.info(
            "Policy decision computed",
            extra={
                "sentinel_context": {
                    "action": action,
                    "confidence": max_score,
                    "rule_hits": [hit.tripwire for hit in rule_hits],
                }
            },
        )
        return decision
