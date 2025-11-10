from __future__ import annotations

import hashlib
import hmac
import os
from dataclasses import dataclass
from typing import Dict


@dataclass
class SignedMessage:
    topic: str
    payload: dict
    signature: str


class SignatureAuthority:
    """Simplified HMAC based signing component."""

    def __init__(self, *, key: bytes | None = None) -> None:
        self._key = key or os.urandom(32)
        self._trusted_keys: Dict[str, bytes] = {"default": self._key}

    def sign(self, *, topic: str, payload: dict) -> SignedMessage:
        serialized = f"{topic}:{sorted(payload.items())}".encode()
        digest = hmac.new(self._key, serialized, hashlib.sha256).hexdigest()
        return SignedMessage(topic=topic, payload=payload, signature=digest)

    def verify(self, message: SignedMessage) -> bool:
        expected = self.sign(topic=message.topic, payload=message.payload)
        return hmac.compare_digest(expected.signature, message.signature)

    def add_trusted_key(self, name: str, key: bytes) -> None:
        self._trusted_keys[name] = key

    def rotate(self, *, name: str) -> None:
        self._trusted_keys["default"] = self._trusted_keys[name]
        self._key = self._trusted_keys[name]
