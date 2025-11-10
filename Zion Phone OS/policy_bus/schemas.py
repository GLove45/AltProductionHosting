from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict


@dataclass
class MessageSchema:
    name: str
    validator: Callable[[dict], None]

    def validate(self, payload: dict) -> None:
        self.validator(payload)


@dataclass
class SchemaRegistry:
    schemas: Dict[str, MessageSchema] = field(default_factory=dict)
    topic_to_schema: Dict[str, str] = field(default_factory=dict)

    def register(self, schema: MessageSchema) -> None:
        self.schemas[schema.name] = schema

    def expect(self, topic: str, schema_name: str) -> None:
        if schema_name not in self.schemas:
            raise KeyError(f"Schema {schema_name!r} has not been registered")
        self.topic_to_schema[topic] = schema_name

    def get_for_topic(self, topic: str) -> MessageSchema:
        schema_name = self.topic_to_schema.get(topic)
        if not schema_name:
            raise KeyError(f"Topic {topic!r} has no schema binding")
        return self.schemas[schema_name]

    @classmethod
    def default(cls) -> "SchemaRegistry":
        registry = cls()

        def ensure_fields(*required: str) -> Callable[[dict], None]:
            def validator(payload: dict) -> None:
                missing = [field for field in required if field not in payload]
                if missing:
                    raise ValueError(f"Missing fields for schema validation: {missing}")
            return validator

        registry.register(MessageSchema("auth.decision", ensure_fields("user", "decision")))
        registry.register(MessageSchema("telemetry.device", ensure_fields("metric", "value")))
        registry.register(MessageSchema("audit.events", ensure_fields("source")))
        registry.register(MessageSchema("policy.commands", ensure_fields("command")))
        registry.register(MessageSchema("health.metrics", ensure_fields("name", "value", "severity")))
        registry.register(MessageSchema("mfa.challenge", ensure_fields("user", "gate", "status")))
        registry.register(MessageSchema("network.alert", ensure_fields("channel", "status")))
        return registry
