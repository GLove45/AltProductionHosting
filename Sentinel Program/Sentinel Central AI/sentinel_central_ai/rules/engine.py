"""Deterministic rules engine."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, Iterable, List

from ..config import RuleConfig
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "rules_engine"})


@dataclass(slots=True)
class RuleHit:
    """Represents a triggered rule and its context."""

    tripwire: str
    score: float
    reason: str


@dataclass(slots=True)
class RuleEngine:
    """Evaluates deterministic tripwires against feature windows."""

    rules: List[RuleConfig]

    @classmethod
    def from_config(cls, rules: List[RuleConfig]) -> "RuleEngine":
        logger.debug(
            "Initializing RuleEngine",
            extra={"sentinel_context": {"rule_count": len(rules)}},
        )
        return cls(rules=rules)

    def evaluate(self, features: Dict[str, float]) -> List[RuleHit]:
        """Evaluate deterministic rules against the latest features."""

        hits: List[RuleHit] = []
        for rule in self.rules:
            if not rule.enabled:
                logger.debug(
                    "Rule disabled",
                    extra={"sentinel_context": {"tripwire": rule.tripwire}},
                )
                continue
            value = features.get(rule.tripwire, 0.0)
            threshold = float(rule.threshold or 0)
            if value >= threshold and threshold > 0:
                hit = RuleHit(
                    tripwire=rule.tripwire,
                    score=value,
                    reason=rule.description,
                )
                hits.append(hit)
                logger.info(
                    "Rule triggered",
                    extra={
                        "sentinel_context": {
                            "tripwire": rule.tripwire,
                            "value": value,
                            "threshold": threshold,
                        }
                    },
                )
            else:
                logger.debug(
                    "Rule evaluated",
                    extra={
                        "sentinel_context": {
                            "tripwire": rule.tripwire,
                            "value": value,
                            "threshold": threshold,
                        }
                    },
                )
        return hits
