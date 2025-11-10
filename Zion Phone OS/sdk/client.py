from __future__ import annotations

from typing import Callable

from app_runtime.permissions import PermissionModel, PermissionDenied
from policy_bus.bus import PolicyBus


class ZionSDK:
    """SDK used by third-party modules to interact with the Policy Bus."""

    def __init__(self, *, module_name: str, bus: PolicyBus, permissions: PermissionModel) -> None:
        self._module_name = module_name
        self._bus = bus
        self._permissions = permissions

    def publish(self, topic: str, payload: dict) -> None:
        self._permissions.guard_publish(module_name=self._module_name, topic=topic)
        self._bus.publish(topic, payload)

    def subscribe(self, topic: str, handler: Callable[[dict], None]) -> None:
        self._permissions.guard_subscribe(module_name=self._module_name, topic=topic)
        self._bus.subscribe(topic, handler)

    def request_permission(self, topic: str, *, access: str) -> None:
        if access == "publish":
            self._permissions.allow(module=self._module_name, publish={topic})
        elif access == "subscribe":
            self._permissions.allow(module=self._module_name, subscribe={topic})
        else:
            raise PermissionDenied(f"Unknown access level {access}")
