from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Callable, Deque, Dict, Iterable, List

from .schemas import SchemaRegistry
from .security import SignedMessage, SignatureAuthority


@dataclass
class QueuedMessage:
    topic: str
    payload: dict
    signature: SignedMessage


class PolicyBus:
    """In-memory Policy Bus broker for integration testing."""

    def __init__(self, *, registry: SchemaRegistry, authority: SignatureAuthority) -> None:
        self._registry = registry
        self._authority = authority
        self._subscriptions: Dict[str, List[Callable[[dict], None]]] = defaultdict(list)
        self._queue: Deque[QueuedMessage] = deque()
        self._errors: List[str] = []

    def register_topic(self, topic: str, schema_name: str) -> None:
        self._registry.expect(topic, schema_name)

    def subscribe(self, topic: str, handler: Callable[[dict], None]) -> None:
        self._subscriptions[topic].append(handler)

    def get_handlers(self, topic: str) -> Iterable[Callable[[dict], None]]:
        return tuple(self._subscriptions.get(topic, ()))

    def publish(self, topic: str, payload: dict) -> SignedMessage:
        schema = self._registry.get_for_topic(topic)
        schema.validate(payload)
        signed = self._authority.sign(topic=topic, payload=payload)
        self._queue.append(QueuedMessage(topic=topic, payload=payload, signature=signed))
        return signed

    def drain(self) -> Iterable[dict]:
        while self._queue:
            queued = self._queue.popleft()
            yield {"topic": queued.topic, "payload": queued.payload, "signature": queued.signature}

    def log_error(self, topic: str, payload: dict, exc: Exception) -> None:
        self._errors.append(f"{topic}: {exc!r} for {payload!r}")

    @property
    def errors(self) -> List[str]:
        return self._errors

    @property
    def registry(self) -> SchemaRegistry:
        return self._registry
