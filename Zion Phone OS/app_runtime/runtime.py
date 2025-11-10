from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, Iterable, List, Optional


class RuntimeModule:
    """Base class for Zion runtime modules.

    Modules receive a Policy Bus handle and may register callbacks for runtime
    lifecycle events.  The base class provides telemetry helpers and guarded
    execution utilities so malfunctioning modules cannot crash the runtime loop.
    """

    name: str = "module"

    def __init__(self) -> None:
        self._runtime: Optional["ZionRuntime"] = None

    def attach(self, runtime: "ZionRuntime") -> None:
        self._runtime = runtime
        self.on_attach()

    def on_attach(self) -> None:
        """Hook invoked after the module has been attached to the runtime."""

    def on_start(self) -> None:
        """Hook invoked during runtime start."""

    def on_shutdown(self) -> None:
        """Hook invoked when the runtime is shutting down."""

    def emit(self, topic: str, payload: dict) -> None:
        if not self._runtime:
            raise RuntimeError("Module is not attached to a runtime")
        self._runtime.publish_from_module(self, topic, payload)

    def listen(self, topic: str, handler: Callable[[dict], None]) -> None:
        if not self._runtime:
            raise RuntimeError("Module is not attached to a runtime")
        self._runtime.subscribe_from_module(self, topic, handler)


@dataclass
class RuntimeState:
    started: bool = False
    running_modules: List[RuntimeModule] = field(default_factory=list)


class ZionRuntime:
    """Coordinates runtime modules and enforces the permission model."""

    def __init__(self, *, bus, permissions) -> None:
        self._bus = bus
        self._permissions = permissions
        self._state = RuntimeState()
        self._modules: Dict[str, RuntimeModule] = {}
        self._startup_queue: List[RuntimeModule] = []

    @property
    def state(self) -> RuntimeState:
        return self._state

    def register(self, module: RuntimeModule) -> None:
        if module.name in self._modules:
            raise ValueError(f"Duplicate module name: {module.name}")
        module.attach(self)
        self._modules[module.name] = module
        self._startup_queue.append(module)

    @property
    def bus(self):
        return self._bus

    def publish(self, topic: str, payload: dict) -> None:
        self._permissions.guard_publish(module_name="runtime", topic=topic)
        self._bus.publish(topic, payload)

    def subscribe(self, topic: str, handler: Callable[[dict], None]) -> None:
        self._permissions.guard_subscribe(module_name="runtime", topic=topic)
        self._bus.subscribe(topic, handler)

    def publish_from_module(self, module: RuntimeModule, topic: str, payload: dict) -> None:
        self._permissions.guard_publish(module_name=module.name, topic=topic)
        self._bus.publish(topic, payload)

    def subscribe_from_module(self, module: RuntimeModule, topic: str, handler: Callable[[dict], None]) -> None:
        self._permissions.guard_subscribe(module_name=module.name, topic=topic)
        self._bus.subscribe(topic, handler)

    def start(self) -> None:
        if self._state.started:
            return
        self._state.started = True
        for module in list(self._startup_queue):
            module.on_start()
            self._state.running_modules.append(module)
        self._startup_queue.clear()

    def shutdown(self) -> None:
        if not self._state.started:
            return
        for module in reversed(self._state.running_modules):
            module.on_shutdown()
        self._state = RuntimeState()
        self._modules.clear()

    def get_module(self, name: str) -> RuntimeModule:
        if name not in self._modules:
            raise KeyError(name)
        return self._modules[name]

    def run_cycle(self) -> None:
        """Process a single cycle of policy bus events."""
        for message in self._bus.drain():
            topic = message["topic"]
            payload = message["payload"]
            handlers: Iterable[Callable[[dict], None]] = self._bus.get_handlers(topic)
            for handler in list(handlers):
                try:
                    handler(payload)
                except Exception as exc:  # pragma: no cover - defensive logging
                    self._bus.log_error(topic, payload, exc)
