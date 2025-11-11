"""Contracts for the phone approval APIs."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List

from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "phone_contracts"})


@dataclass(slots=True)
class RegisterPayload:
    device_pubkey: str
    device_label: str
    app_version: str
    attestation: str | None = None


@dataclass(slots=True)
class RegisterResponse:
    device_id: str


@dataclass(slots=True)
class ChallengeRequest:
    session_id: str
    action: str
    reason: str


@dataclass(slots=True)
class ChallengeResponse:
    nonce: str
    expires_at: datetime


@dataclass(slots=True)
class ApprovalPayload:
    device_id: str
    session_id: str
    signed_nonce: str
    sequence: Dict[str, bool]
    issued_at: datetime


@dataclass(slots=True)
class AlertPayload:
    id: str
    timestamp: datetime
    host: str
    severity: str
    summary: str
    rationale: str
    links: List[str]


def describe_sequence(sequence: Dict[str, bool]) -> str:
    """Return a human-readable summary of the sequence flags."""

    description = ", ".join(f"{factor}={'✓' if enabled else '✗'}" for factor, enabled in sequence.items())
    logger.debug(
        "Described approval sequence",
        extra={"sentinel_context": {"sequence": sequence, "description": description}},
    )
    return description
