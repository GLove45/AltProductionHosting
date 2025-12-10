"""
mail_security_service

Role: Hooks spam filtering, malware checks on attachments, and policy enforcement (TLS, MTA-STS) into mail pipeline.
Trigger/Interface: Worker / MTA integration.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)



class MailSecurityService:
    """Lightweight stub capturing the contract for the mail_security_service component."""

    def __init__(self) -> None:
        self.status: str = "idle"

    def describe(self) -> Dict[str, str]:
        """Return a descriptive snapshot of the service's responsibilities."""
        return {
            "name": "mail_security_service",
            "role": "Hooks spam filtering, malware checks on attachments, and policy enforcement (TLS, MTA-STS) into mail pipeline.",
            "interface": "Worker / MTA integration.",
            "status": self.status,
        }

    def plan_action(self, task: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Log and outline the next action without executing real side effects."""
        logger.info("Planning task %s for %s", task, "mail_security_service")
        return {
            "task": task,
            "metadata": metadata or {},
            "status": "planned",
            "service": "mail_security_service",
        }

    def mark_running(self) -> None:
        """Set the service state to running for orchestration bookkeeping."""
        logger.debug("%s entering running state", "MailSecurityService")
        self.status = "running"

    def mark_completed(self) -> None:
        """Mark the last planned activity as completed."""
        logger.debug("%s completed current task", "MailSecurityService")
        self.status = "idle"

    def mark_error(self, message: str) -> None:
        """Capture an error condition without throwing to keep control loops alive."""
        logger.error("%s encountered an error: %s", "MailSecurityService", message)
        self.status = f"error: {message}"
