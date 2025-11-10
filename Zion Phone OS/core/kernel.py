from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List


@dataclass
class KernelModule:
    name: str

    def start(self) -> None:
        """Start the kernel module."""

    def stop(self) -> None:
        """Stop the kernel module."""


@dataclass
class KernelState:
    modules: Dict[str, KernelModule] = field(default_factory=dict)
    boot_completed: bool = False
    selinux_mode: str = "permissive"


class Kernel:
    """Toy kernel orchestrator that wires together core services."""

    def __init__(self) -> None:
        self._state = KernelState()
        self._boot_log: List[str] = []

    def register_module(self, module: KernelModule) -> None:
        if module.name in self._state.modules:
            raise ValueError(f"Duplicate kernel module {module.name}")
        self._state.modules[module.name] = module

    def boot(self) -> None:
        if self._state.boot_completed:
            return
        self._boot_log.append("boot: verified boot chain OK")
        self._boot_log.append("boot: enabling selinux enforcing")
        self._state.selinux_mode = "enforcing"
        for module in self._state.modules.values():
            module.start()
            self._boot_log.append(f"boot: started {module.name}")
        self._state.boot_completed = True

    def shutdown(self) -> None:
        if not self._state.boot_completed:
            return
        for module in reversed(list(self._state.modules.values())):
            module.stop()
            self._boot_log.append(f"shutdown: stopped {module.name}")
        self._state.boot_completed = False
        self._state.selinux_mode = "permissive"

    @property
    def boot_log(self) -> Iterable[str]:
        return tuple(self._boot_log)

    @property
    def state(self) -> KernelState:
        return self._state
