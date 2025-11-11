"""UI façade for the Sentinel single-pane experience."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List

from ..coordinator.services import Alert, Coordinator
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "ui_dashboard"})


@dataclass(slots=True)
class Dashboard:
    """High-level interface that the SPA will query."""

    coordinator: Coordinator

    def current_posture(self) -> Dict[str, object]:
        alerts = self.coordinator.latest_alerts(limit=1)
        posture = {
            "coordinator_host": self.coordinator.config.host,
            "policy_mode": self.coordinator.policy_engine.thresholds,
            "latest_alert": alerts[0].summary if alerts else "None",
        }
        logger.debug(
            "Computed current posture",
            extra={"sentinel_context": posture},
        )
        return posture

    def timeline(self, limit: int = 10) -> List[Alert]:
        alerts = self.coordinator.latest_alerts(limit=limit)
        logger.debug(
            "Fetched timeline",
            extra={"sentinel_context": {"count": len(alerts)}},
        )
        return alerts
