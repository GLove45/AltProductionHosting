from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict


@dataclass
class Certificate:
    serial: int
    subject: str
    issued_at: datetime
    expires_at: datetime

    def expired(self) -> bool:
        return datetime.utcnow() > self.expires_at


class CertificateAuthority:
    def __init__(self) -> None:
        self._certificates: Dict[str, Certificate] = {}
        self._revoked: Dict[int, datetime] = {}

    def issue(self, subject: str, *, ttl_days: int = 90) -> Certificate:
        serial = secrets.randbits(32)
        now = datetime.utcnow()
        cert = Certificate(serial=serial, subject=subject, issued_at=now, expires_at=now + timedelta(days=ttl_days))
        self._certificates[subject] = cert
        return cert

    def revoke(self, serial: int) -> None:
        self._revoked[serial] = datetime.utcnow()

    def is_valid(self, subject: str) -> bool:
        cert = self._certificates.get(subject)
        if not cert or cert.expired():
            return False
        if cert.serial in self._revoked:
            return False
        return True

    @property
    def revoked_serials(self) -> Dict[int, datetime]:
        return dict(self._revoked)
