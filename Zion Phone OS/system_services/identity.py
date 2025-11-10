from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class IdentityProfile:
    user: str
    device_id: str
    strongbox_key: str


class IdentityProvisioningService:
    def __init__(self) -> None:
        self._profiles: Dict[str, IdentityProfile] = {}

    def enroll(self, user: str, device_id: str, *, strongbox_key: str) -> IdentityProfile:
        profile = IdentityProfile(user=user, device_id=device_id, strongbox_key=strongbox_key)
        self._profiles[user] = profile
        return profile

    def lookup(self, user: str) -> IdentityProfile:
        if user not in self._profiles:
            raise KeyError(user)
        return self._profiles[user]
