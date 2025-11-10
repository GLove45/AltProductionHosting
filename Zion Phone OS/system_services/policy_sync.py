from __future__ import annotations

from typing import Dict

from policy_bus.bus import PolicyBus
from policy_bus.schemas import SchemaRegistry


class PolicySyncService:
    def __init__(self, *, bus: PolicyBus, registry: SchemaRegistry) -> None:
        self._bus = bus
        self._registry = registry
        self._subscriptions: Dict[str, int] = {}

    def register_topic(self, topic: str, schema_name: str) -> None:
        self._bus.register_topic(topic, schema_name)
        self._subscriptions[topic] = 0

    def publish(self, topic: str, payload: dict) -> None:
        self._bus.publish(topic, payload)
        self._subscriptions[topic] = self._subscriptions.get(topic, 0) + 1

    def stats(self) -> Dict[str, int]:
        return dict(self._subscriptions)
