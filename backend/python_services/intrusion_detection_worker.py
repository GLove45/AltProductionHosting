"""
intrusion_detection_worker

Role: Implements host-level and app-level anomaly detection, blocklists abusive IPs, and integrates with firewall (ufw/iptables/nftables) to apply bans.
Trigger/Interface: Worker fed from security_log_collector.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)



class IntrusionDetectionWorker:
    """Lightweight stub capturing the contract for the intrusion_detection_worker component."""

    def __init__(self) -> None:
        self.status: str = "idle"

    def describe(self) -> Dict[str, str]:
        """Return a descriptive snapshot of the service's responsibilities."""
        return {
            "name": "intrusion_detection_worker",
            "role": "Implements host-level and app-level anomaly detection, blocklists abusive IPs, and integrates with firewall (ufw/iptables/nftables) to apply bans.",
            "interface": "Worker fed from security_log_collector.",
            "status": self.status,
        }

    def plan_action(self, task: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Log and outline the next action without executing real side effects."""
        logger.info("Planning task %s for %s", task, "intrusion_detection_worker")
        return {
            "task": task,
            "metadata": metadata or {},
            "status": "planned",
            "service": "intrusion_detection_worker",
        }

    def mark_running(self) -> None:
        """Set the service state to running for orchestration bookkeeping."""
        logger.debug("%s entering running state", "IntrusionDetectionWorker")
        self.status = "running"

    def mark_completed(self) -> None:
        """Mark the last planned activity as completed."""
        logger.debug("%s completed current task", "IntrusionDetectionWorker")
        self.status = "idle"

    def mark_error(self, message: str) -> None:
        """Capture an error condition without throwing to keep control loops alive."""
        logger.error("%s encountered an error: %s", "IntrusionDetectionWorker", message)
        self.status = f"error: {message}"
