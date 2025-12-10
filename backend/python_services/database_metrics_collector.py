"""
database_metrics_collector

Role: Collects DB performance stats (connections, slow queries, disk usage) and surfaces them for the dashboard insights and Sentinel risk scoring.
Trigger/Interface: Scheduled worker.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)



class DatabaseMetricsCollector:
    """Lightweight stub capturing the contract for the database_metrics_collector component."""

    def __init__(self) -> None:
        self.status: str = "idle"

    def describe(self) -> Dict[str, str]:
        """Return a descriptive snapshot of the service's responsibilities."""
        return {
            "name": "database_metrics_collector",
            "role": "Collects DB performance stats (connections, slow queries, disk usage) and surfaces them for the dashboard insights and Sentinel risk scoring.",
            "interface": "Scheduled worker.",
            "status": self.status,
        }

    def plan_action(self, task: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Log and outline the next action without executing real side effects."""
        logger.info("Planning task %s for %s", task, "database_metrics_collector")
        return {
            "task": task,
            "metadata": metadata or {},
            "status": "planned",
            "service": "database_metrics_collector",
        }

    def mark_running(self) -> None:
        """Set the service state to running for orchestration bookkeeping."""
        logger.debug("%s entering running state", "DatabaseMetricsCollector")
        self.status = "running"

    def mark_completed(self) -> None:
        """Mark the last planned activity as completed."""
        logger.debug("%s completed current task", "DatabaseMetricsCollector")
        self.status = "idle"

    def mark_error(self, message: str) -> None:
        """Capture an error condition without throwing to keep control loops alive."""
        logger.error("%s encountered an error: %s", "DatabaseMetricsCollector", message)
        self.status = f"error: {message}"
