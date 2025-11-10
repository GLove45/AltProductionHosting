from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class SELinuxPolicyOverlay:
    domains: Dict[str, List[str]] = field(default_factory=dict)

    def allow(self, domain: str, *, types: List[str]) -> None:
        self.domains.setdefault(domain, []).extend(types)

    def compile(self) -> str:
        return "\n".join(
            f"allow {domain} {t} : file {{ read getattr }};" for domain, types in self.domains.items() for t in types
        )
