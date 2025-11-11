"""Contracts for the phone approval APIs."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Dict, List, Optional

from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "phone_contracts"})

APPROVAL_WINDOW = timedelta(minutes=30)
OFFLINE_TOLERANCE = timedelta(minutes=5)


@dataclass(slots=True)
class RegisterPayload:
    device_pubkey: str
    device_label: str
    app_version: str
    attestation: str | None = None


@dataclass(slots=True)
class RegisterResponse:
    device_id: str
    enrollment_token: str
    issued_at: datetime


@dataclass(slots=True)
class ChallengeRequest:
    session_id: str
    action: str
    reason: str
    approval_window: timedelta = APPROVAL_WINDOW
    offline_fallback: bool = True


@dataclass(slots=True)
class ChallengeResponse:
    nonce: str
    expires_at: datetime
    device_id: str
    qr_payload: str | None = None
    offline_allowed_until: datetime | None = None


@dataclass(slots=True)
class ApprovalPayload:
    device_id: str
    session_id: str
    signed_nonce: str
    sequence: Dict[str, bool]
    issued_at: datetime
    posture_claims: Dict[str, str] | None = None


@dataclass(slots=True)
class AlertPayload:
    id: str
    timestamp: datetime
    host: str
    severity: str
    summary: str
    rationale: str
    links: List[str]


@dataclass(slots=True)
class DevicePostureClaim:
    """Describes the mobile posture presented during approval."""

    rooted: bool
    developer_mode: bool
    unknown_sources: bool
    vpn_active: bool
    last_attested: datetime
    anomalies: List[str] = field(default_factory=list)


@dataclass(slots=True)
class ApprovalToken:
    """Issued token that authorizes human-in-the-loop actions."""

    token: str
    device_id: str
    scope: str
    issued_at: datetime
    expires_at: datetime
    offline_capable: bool = False


@dataclass(slots=True)
class ApprovalResponse:
    """REST response for /approve endpoint."""

    approved: bool
    message: str
    token: Optional[ApprovalToken]
    requires_reauth: bool


@dataclass(slots=True)
class RevokeRequest:
    """Payload for revoking an outstanding approval token."""

    device_id: str
    token: str
    reason: str


@dataclass(slots=True)
class RevokeResponse:
    """Response body acknowledging revocation."""

    revoked: bool
    revoked_at: datetime
    message: str


def describe_sequence(sequence: Dict[str, bool]) -> str:
    """Return a human-readable summary of the sequence flags."""

    description = ", ".join(f"{factor}={'✓' if enabled else '✗'}" for factor, enabled in sequence.items())
    logger.debug(
        "Described approval sequence",
        extra={"sentinel_context": {"sequence": sequence, "description": description}},
    )
    return description


def build_challenge_response(request: ChallengeRequest, device_id: str, nonce: str) -> ChallengeResponse:
    """Construct a challenge response including offline fallback metadata."""

    expires_at = datetime.now(UTC) + request.approval_window
    offline_until = (datetime.now(UTC) + OFFLINE_TOLERANCE) if request.offline_fallback else None
    qr_payload = f"sentinel://challenge/{device_id}/{nonce}" if request.offline_fallback else None
    response = ChallengeResponse(
        nonce=nonce,
        expires_at=expires_at,
        device_id=device_id,
        qr_payload=qr_payload,
        offline_allowed_until=offline_until,
    )
    logger.info(
        "Challenge issued",
        extra={
            "sentinel_context": {
                "device_id": device_id,
                "expires_at": expires_at.isoformat(),
                "offline": bool(qr_payload),
            }
        },
    )
    return response


def build_approval_response(payload: ApprovalPayload, scope: str) -> ApprovalResponse:
    """Create an approval response and associated token."""

    expires_at = payload.issued_at + APPROVAL_WINDOW
    token = ApprovalToken(
        token=f"tok-{payload.session_id}-{int(payload.issued_at.timestamp())}",
        device_id=payload.device_id,
        scope=scope,
        issued_at=payload.issued_at,
        expires_at=expires_at,
        offline_capable=True,
    )
    response = ApprovalResponse(
        approved=True,
        message="Approval token issued",
        token=token,
        requires_reauth=False,
    )
    logger.info(
        "Approval granted",
        extra={
            "sentinel_context": {
                "device_id": payload.device_id,
                "session_id": payload.session_id,
                "expires_at": expires_at.isoformat(),
            }
        },
    )
    return response


def build_revoke_response(request: RevokeRequest) -> RevokeResponse:
    """Generate a revoke acknowledgement payload."""

    revoked_at = datetime.now(UTC)
    response = RevokeResponse(
        revoked=True,
        revoked_at=revoked_at,
        message=f"Token {request.token} revoked for device {request.device_id}",
    )
    logger.warning(
        "Approval token revoked",
        extra={
            "sentinel_context": {
                "device_id": request.device_id,
                "token": request.token,
                "reason": request.reason,
            }
        },
    )
    return response
