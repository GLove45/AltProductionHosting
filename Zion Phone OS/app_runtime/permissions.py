from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Set


class PermissionDenied(RuntimeError):
    pass


@dataclass
class PermissionModel:
    publish_rules: Dict[str, Set[str]] = field(default_factory=dict)
    subscribe_rules: Dict[str, Set[str]] = field(default_factory=dict)

    def allow(self, *, module: str, publish: Set[str] | None = None, subscribe: Set[str] | None = None) -> None:
        if publish:
            self.publish_rules.setdefault(module, set()).update(publish)
        if subscribe:
            self.subscribe_rules.setdefault(module, set()).update(subscribe)

    def guard_publish(self, *, module_name: str, topic: str) -> None:
        allowed = self.publish_rules.get(module_name, set())
        if topic not in allowed and "*" not in allowed:
            raise PermissionDenied(f"Module {module_name!r} is not permitted to publish {topic}")

    def guard_subscribe(self, *, module_name: str, topic: str) -> None:
        allowed = self.subscribe_rules.get(module_name, set())
        if topic not in allowed and "*" not in allowed:
            raise PermissionDenied(f"Module {module_name!r} is not permitted to subscribe to {topic}")

    @classmethod
    def hardened_default(cls) -> "PermissionModel":
        model = cls()
        model.allow(module="runtime", publish={"audit.events", "telemetry.device"}, subscribe={"policy.commands"})
        return model
