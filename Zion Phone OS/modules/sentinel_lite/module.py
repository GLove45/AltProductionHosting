from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from app_runtime.runtime import RuntimeModule


@dataclass
class GateConfig:
    name: str
    timeout_seconds: int


class SentinelLiteModule(RuntimeModule):
    name = "sentinel_lite"

    def __init__(self) -> None:
        super().__init__()
        self.gates: List[GateConfig] = [
            GateConfig("device_posture", 20),
            GateConfig("pin", 45),
            GateConfig("biometric", 30),
            GateConfig("sentinel_prompt", 60),
            GateConfig("human_verification", 90),
        ]
        self.evidence_bundles: List[Dict[str, str]] = []

    def assemble_evidence(self, user: str, device_id: str) -> Dict[str, str]:
        bundle = {"user": user, "device": device_id, "signature": f"sig-{user}-{device_id}"}
        self.evidence_bundles.append(bundle)
        self.emit("audit.events", {"source": self.name, "bundle": bundle})
        return bundle
