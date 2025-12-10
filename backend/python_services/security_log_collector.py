"""
security_log_collector

Role: Normalises logs from nginx, SSH, mail, DB and the OS into a central security event feed for Sentinel and audit trails.
Trigger/Interface: Agent/daemon on nodes.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)



class SecurityLogCollector:
    """Lightweight stub capturing the contract for the security_log_collector component."""

    def __init__(self) -> None:
        self.status: str = "idle"

    def describe(self) -> Dict[str, str]:
        """Return a descriptive snapshot of the service's responsibilities."""
        return {
            "name": "security_log_collector",
            "role": "Normalises logs from nginx, SSH, mail, DB and the OS into a central security event feed for Sentinel and audit trails.",
            "interface": "Agent/daemon on nodes.",
            "status": self.status,
        }

    def plan_action(self, task: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Log and outline the next action without executing real side effects."""
        logger.info("Planning task %s for %s", task, "security_log_collector")
        return {
            "task": task,
            "metadata": metadata or {},
            "status": "planned",
            "service": "security_log_collector",
        }

    def mark_running(self) -> None:
        """Set the service state to running for orchestration bookkeeping."""
        logger.debug("%s entering running state", "SecurityLogCollector")
        self.status = "running"

    def mark_completed(self) -> None:
        """Mark the last planned activity as completed."""
        logger.debug("%s completed current task", "SecurityLogCollector")
        self.status = "idle"

    def mark_error(self, message: str) -> None:
        """Capture an error condition without throwing to keep control loops alive."""
        logger.error("%s encountered an error: %s", "SecurityLogCollector", message)
        self.status = f"error: {message}"
