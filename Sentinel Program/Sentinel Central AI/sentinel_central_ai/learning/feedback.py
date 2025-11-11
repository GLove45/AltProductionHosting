"""Human-in-the-loop feedback scaffolding."""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import DefaultDict, Dict, List

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


@dataclass(slots=True)
class FeedbackLoop:
    """Captures operator decisions and produces promotion suggestions."""

    window_sizes: List[timedelta]
    history: List[FeedbackRecord] = field(default_factory=list)
    approvals: DefaultDict[str, int] = field(default_factory=lambda: defaultdict(int))

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
        logger.debug(
            "Updated approvals",
            extra={
                "sentinel_context": {
                    "key": key,
                    "count": self.approvals[key],
                }
            },
        )

    def suggestions(self, minimum: int = 3) -> Dict[str, int]:
        """Return suggestions that reached the promotion threshold."""

        ready = {key: count for key, count in self.approvals.items() if count >= minimum}
        logger.debug(
            "Computed suggestions",
            extra={
                "sentinel_context": {
                    "minimum": minimum,
                    "ready": ready,
                }
            },
        )
        return ready
