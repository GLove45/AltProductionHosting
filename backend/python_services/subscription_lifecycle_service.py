"""
subscription_lifecycle_service

Role: Manages plan upgrades/downgrades, free trials, cancellations, and associated technical changes (e.g. increasing quotas, suspending domains on non-payment).
Trigger/Interface: HTTP API.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)



class SubscriptionLifecycleService:
    """Lightweight stub capturing the contract for the subscription_lifecycle_service component."""

    def __init__(self) -> None:
        self.status: str = "idle"

    def describe(self) -> Dict[str, str]:
        """Return a descriptive snapshot of the service's responsibilities."""
        return {
            "name": "subscription_lifecycle_service",
            "role": "Manages plan upgrades/downgrades, free trials, cancellations, and associated technical changes (e.g. increasing quotas, suspending domains on non-payment).",
            "interface": "HTTP API.",
            "status": self.status,
        }

    def plan_action(self, task: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Log and outline the next action without executing real side effects."""
        logger.info("Planning task %s for %s", task, "subscription_lifecycle_service")
        return {
            "task": task,
            "metadata": metadata or {},
            "status": "planned",
            "service": "subscription_lifecycle_service",
        }

    def mark_running(self) -> None:
        """Set the service state to running for orchestration bookkeeping."""
        logger.debug("%s entering running state", "SubscriptionLifecycleService")
        self.status = "running"

    def mark_completed(self) -> None:
        """Mark the last planned activity as completed."""
        logger.debug("%s completed current task", "SubscriptionLifecycleService")
        self.status = "idle"

    def mark_error(self, message: str) -> None:
        """Capture an error condition without throwing to keep control loops alive."""
        logger.error("%s encountered an error: %s", "SubscriptionLifecycleService", message)
        self.status = f"error: {message}"
