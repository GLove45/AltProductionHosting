from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from app_runtime.runtime import RuntimeModule


@dataclass
class Gate:
    name: str
    timeout_seconds: int


class AdvancedMFAModule(RuntimeModule):
    name = "advanced_mfa"

    def __init__(self) -> None:
        super().__init__()
        self.gates: List[Gate] = [
            Gate("device_trust", 30),
            Gate("pin", 45),
            Gate("biometric", 30),
            Gate("hardware_token", 60),
            Gate("risk_review", 90),
        ]
        self.analytics: List[Dict[str, str]] = []

    def on_start(self) -> None:
        self.listen("mfa.challenge", self._record_result)

    def orchestrate(self, user: str) -> List[str]:
        sequence = []
        for gate in self.gates:
            challenge = {"user": user, "gate": gate.name, "status": "pending"}
            self.emit("mfa.challenge", challenge)
            sequence.append(gate.name)
        return sequence

    def _record_result(self, payload: dict) -> None:
        self.analytics.append({"gate": payload["gate"], "status": payload["status"]})
        self.emit("audit.events", {"source": self.name, "challenge": payload})
