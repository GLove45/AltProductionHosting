from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict

from .runtime import RuntimeModule


@dataclass
class FlowStep:
    name: str
    action: Callable[[dict], dict]

    def execute(self, context: dict) -> dict:
        return self.action(context)


class AuthenticationDemoApp(RuntimeModule):
    name = "auth_demo"

    def __init__(self) -> None:
        super().__init__()
        self._steps = [
            FlowStep("collect_credentials", self._collect_credentials),
            FlowStep("evaluate_policy", self._evaluate_policy),
            FlowStep("finalize", self._finalize),
        ]

    def on_start(self) -> None:
        self.listen("policy.commands", self._on_policy_command)

    def trigger_login(self, username: str) -> Dict[str, str]:
        context: Dict[str, str] = {"username": username}
        for step in self._steps:
            context = step.execute(context)
        return context

    def _collect_credentials(self, context: dict) -> dict:
        context["status"] = "credentials_collected"
        return context

    def _evaluate_policy(self, context: dict) -> dict:
        decision = {"topic": "auth.decision", "payload": {"user": context["username"], "decision": "allow"}}
        self.emit(decision["topic"], decision["payload"])
        context["policy"] = decision["payload"]
        return context

    def _finalize(self, context: dict) -> dict:
        context["status"] = "complete"
        return context

    def _on_policy_command(self, payload: dict) -> None:
        self.emit("audit.events", {"source": self.name, "command": payload})


class DeviceHealthDashboard(RuntimeModule):
    name = "device_health_dashboard"

    def __init__(self) -> None:
        super().__init__()
        self.latest_metrics: Dict[str, float] = {}

    def on_start(self) -> None:
        self.listen("telemetry.device", self._ingest_metrics)

    def _ingest_metrics(self, payload: dict) -> None:
        for metric, value in payload.items():
            self.latest_metrics[metric] = value
        self.emit("audit.events", {"source": self.name, "observed": payload})
