from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

from app_runtime.runtime import RuntimeModule


@dataclass
class OfflineAction:
    name: str
    steps: List[str]


class AdminConsoleModule(RuntimeModule):
    name = "admin_console"

    def __init__(self) -> None:
        super().__init__()
        self.audit_log: List[dict] = []
        self.offline_actions: Dict[str, OfflineAction] = {}

    def on_attach(self) -> None:
        self.offline_actions["secure_wipe"] = OfflineAction(
            name="secure_wipe",
            steps=[
                "collect_operator_signature",
                "queue_policy_bus_quarantine",
                "mark_device_unavailable",
            ],
        )

    def on_start(self) -> None:
        self.listen("policy.commands", self._handle_policy_command)

    def _handle_policy_command(self, payload: dict) -> None:
        record = {"command": payload, "status": "acknowledged"}
        self.audit_log.append(record)
        self.emit("audit.events", {"source": self.name, "record": record})

    def execute_offline_flow(self, name: str) -> List[str]:
        flow = self.offline_actions.get(name)
        if not flow:
            raise KeyError(f"Unknown offline flow {name}")
        executed = []
        for step in flow.steps:
            executed.append(step)
        return executed
