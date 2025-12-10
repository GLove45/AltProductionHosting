"""
mail_domain_manager

Role: Configures a domain for mail: MX records, SPF, DKIM, DMARC templates, ties into whatever MTA you deploy (Postfix/Exim/custom).
Trigger/Interface: HTTP API + worker.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)



class MailDomainManager:
    """Lightweight stub capturing the contract for the mail_domain_manager component."""

    def __init__(self) -> None:
        self.status: str = "idle"

    def describe(self) -> Dict[str, str]:
        """Return a descriptive snapshot of the service's responsibilities."""
        return {
            "name": "mail_domain_manager",
            "role": "Configures a domain for mail: MX records, SPF, DKIM, DMARC templates, ties into whatever MTA you deploy (Postfix/Exim/custom).",
            "interface": "HTTP API + worker.",
            "status": self.status,
        }

    def plan_action(self, task: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Log and outline the next action without executing real side effects."""
        logger.info("Planning task %s for %s", task, "mail_domain_manager")
        return {
            "task": task,
            "metadata": metadata or {},
            "status": "planned",
            "service": "mail_domain_manager",
        }

    def mark_running(self) -> None:
        """Set the service state to running for orchestration bookkeeping."""
        logger.debug("%s entering running state", "MailDomainManager")
        self.status = "running"

    def mark_completed(self) -> None:
        """Mark the last planned activity as completed."""
        logger.debug("%s completed current task", "MailDomainManager")
        self.status = "idle"

    def mark_error(self, message: str) -> None:
        """Capture an error condition without throwing to keep control loops alive."""
        logger.error("%s encountered an error: %s", "MailDomainManager", message)
        self.status = f"error: {message}"
