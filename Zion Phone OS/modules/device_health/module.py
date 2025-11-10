from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from app_runtime.runtime import RuntimeModule


@dataclass
class MetricDefinition:
    name: str
    threshold: float
    severity: str


class DeviceHealthModule(RuntimeModule):
    name = "device_health"

    def __init__(self) -> None:
        super().__init__()
        self.metrics: Dict[str, MetricDefinition] = {
            "battery_temperature": MetricDefinition("battery_temperature", 45.0, "critical"),
            "cpu_temperature": MetricDefinition("cpu_temperature", 80.0, "warning"),
            "storage_health": MetricDefinition("storage_health", 20.0, "warning"),
        }
        self.history: List[dict] = []

    def run_diagnostics(self, readings: Dict[str, float]) -> List[dict]:
        alerts = []
        for name, value in readings.items():
            definition = self.metrics.get(name)
            if not definition:
                continue
            alert = {
                "name": name,
                "value": value,
                "severity": definition.severity,
                "breach": value >= definition.threshold,
            }
            self.history.append(alert)
            self.emit("health.metrics", alert)
            alerts.append(alert)
        return alerts
