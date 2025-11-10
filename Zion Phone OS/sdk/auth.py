from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class Token:
    value: str
    expires_at: datetime

    def expired(self) -> bool:
        return datetime.utcnow() >= self.expires_at


class TokenAuthority:
    def __init__(self) -> None:
        self._issued: dict[str, Token] = {}

    def issue(self, *, subject: str, ttl_seconds: int = 300) -> Token:
        token = Token(value=secrets.token_hex(16), expires_at=datetime.utcnow() + timedelta(seconds=ttl_seconds))
        self._issued[subject] = token
        return token

    def verify(self, *, subject: str, token: str) -> bool:
        stored = self._issued.get(subject)
        if not stored:
            return False
        if stored.expired():
            return False
        return secrets.compare_digest(stored.value, token)
