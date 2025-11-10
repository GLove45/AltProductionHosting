from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class PolicyBundle:
    name: str
    version: str
    rules: Dict[str, str]


class PolicyDistributionService:
    def __init__(self) -> None:
        self._bundles: Dict[str, PolicyBundle] = {}
        self._history: List[str] = []

    def publish(self, bundle: PolicyBundle) -> None:
        self._bundles[bundle.name] = bundle
        self._history.append(f"{bundle.name}@{bundle.version}")

    def get(self, name: str) -> PolicyBundle:
        if name not in self._bundles:
            raise KeyError(name)
        return self._bundles[name]

    @property
    def history(self) -> List[str]:
        return list(self._history)
