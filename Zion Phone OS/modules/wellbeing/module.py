from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from app_runtime.runtime import RuntimeModule


@dataclass
class TelemetryPoint:
    name: str
    retention_days: int


class WellbeingModule(RuntimeModule):
    name = "wellbeing"

    def __init__(self) -> None:
        super().__init__()
        self.telemetry: Dict[str, TelemetryPoint] = {
            "screen_time": TelemetryPoint("screen_time", 14),
            "posture": TelemetryPoint("posture", 7),
        }
        self.settings = {"enabled": False}

    def toggle(self, enabled: bool) -> None:
        self.settings["enabled"] = enabled
        self.emit("audit.events", {"source": self.name, "enabled": enabled})

    def record_metric(self, name: str, value: float) -> dict:
        if not self.settings["enabled"]:
            return {"status": "skipped"}
        telemetry = self.telemetry.get(name)
        if not telemetry:
            raise KeyError(f"Unknown telemetry {name}")
        event = {"name": name, "value": value, "retention_days": telemetry.retention_days}
        self.emit("telemetry.device", {"metric": name, "value": value})
        return event
