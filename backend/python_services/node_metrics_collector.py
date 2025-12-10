"""
node_metrics_collector

Role: Collects CPU, RAM, disk, temperature and network stats from each Pi node in the cluster to feed the dashboard and alerting.
Trigger/Interface: Agent on each node → central API.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)



class NodeMetricsCollector:
    """Lightweight stub capturing the contract for the node_metrics_collector component."""

    def __init__(self) -> None:
        self.status: str = "idle"

    def describe(self) -> Dict[str, str]:
        """Return a descriptive snapshot of the service's responsibilities."""
        return {
            "name": "node_metrics_collector",
            "role": "Collects CPU, RAM, disk, temperature and network stats from each Pi node in the cluster to feed the dashboard and alerting.",
            "interface": "Agent on each node → central API.",
            "status": self.status,
        }

    def plan_action(self, task: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Log and outline the next action without executing real side effects."""
        logger.info("Planning task %s for %s", task, "node_metrics_collector")
        return {
            "task": task,
            "metadata": metadata or {},
            "status": "planned",
            "service": "node_metrics_collector",
        }

    def mark_running(self) -> None:
        """Set the service state to running for orchestration bookkeeping."""
        logger.debug("%s entering running state", "NodeMetricsCollector")
        self.status = "running"

    def mark_completed(self) -> None:
        """Mark the last planned activity as completed."""
        logger.debug("%s completed current task", "NodeMetricsCollector")
        self.status = "idle"

    def mark_error(self, message: str) -> None:
        """Capture an error condition without throwing to keep control loops alive."""
        logger.error("%s encountered an error: %s", "NodeMetricsCollector", message)
        self.status = f"error: {message}"
