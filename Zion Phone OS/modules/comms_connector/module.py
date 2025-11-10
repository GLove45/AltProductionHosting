from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from app_runtime.runtime import RuntimeModule


@dataclass
class TransportAdapter:
    name: str
    endpoint: str
    retries: int = 3

    def send(self, payload: dict) -> dict:
        return {"adapter": self.name, "endpoint": self.endpoint, "payload": payload, "status": "queued"}


class CommsConnectorModule(RuntimeModule):
    name = "comms_connector"

    def __init__(self) -> None:
        super().__init__()
        self.adapters: Dict[str, TransportAdapter] = {
            "email": TransportAdapter("email", "smtp://relay"),
            "sms": TransportAdapter("sms", "https://sms.example"),
            "webhook": TransportAdapter("webhook", "https://hooks.example"),
        }
        self.queue: List[dict] = []

    def dispatch(self, channel: str, message: dict) -> dict:
        adapter = self.adapters.get(channel)
        if not adapter:
            raise KeyError(f"Unknown channel {channel}")
        result = adapter.send(message)
        self.queue.append(result)
        self.emit("network.alert", {"channel": channel, "status": result["status"]})
        return result
