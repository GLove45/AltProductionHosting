from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class OTAPackage:
    version: str
    slot: str
    url: str


class OTAUpdateService:
    def __init__(self) -> None:
        self._packages: Dict[str, OTAPackage] = {}
        self._history: List[str] = []

    def schedule(self, package: OTAPackage) -> None:
        self._packages[package.slot] = package
        self._history.append(f"{package.version}:{package.slot}")

    def active_slot(self) -> str:
        return "a" if "a" in self._packages else "b"

    @property
    def history(self) -> List[str]:
        return list(self._history)
