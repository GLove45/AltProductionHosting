from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class NetworkRule:
    destination: str
    action: str


class NetworkEnforcementService:
    def __init__(self) -> None:
        self._rules: Dict[str, NetworkRule] = {}
        self._audit: List[str] = []

    def add_rule(self, name: str, destination: str, action: str) -> None:
        self._rules[name] = NetworkRule(destination=destination, action=action)
        self._audit.append(f"rule {name} -> {action} {destination}")

    def evaluate(self, destination: str) -> str:
        for rule in self._rules.values():
            if rule.destination == destination:
                return rule.action
        return "deny"

    @property
    def audit_log(self) -> List[str]:
        return list(self._audit)
