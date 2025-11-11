"""Deterministic rules engine."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable, Dict, List

from ..config import RuleConfig
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "rules_engine"})


@dataclass(slots=True)
class RuleHit:
    """Represents a triggered rule and its context."""

    tripwire: str
    score: float
    reason: str


@dataclass(frozen=True)
class BuiltinDetector:
    """Represents a high-signal detector baked into the engine."""

    tripwire: str
    feature: str
    threshold: float
    description: str
    compute: Callable[[Dict[str, float]], float] | None = None

    def evaluate(self, features: Dict[str, float]) -> float:
        value = self.compute(features) if self.compute else features.get(self.feature, 0.0)
        logger.debug(
            "Evaluated builtin detector",
            extra={
                "sentinel_context": {
                    "tripwire": self.tripwire,
                    "feature": self.feature,
                    "value": value,
                    "threshold": self.threshold,
                }
            },
        )
        return float(value)


def _ratio(numerator: str, denominator: str, scale: float = 1.0) -> Callable[[Dict[str, float]], float]:
    def _inner(features: Dict[str, float]) -> float:
        denom = features.get(denominator, 1.0) or 1.0
        return float(features.get(numerator, 0.0)) / float(denom) * scale

    return _inner


BUILTIN_DETECTORS: List[BuiltinDetector] = [
    BuiltinDetector(
        tripwire="malware.signature_hits",
        feature="malware.signature_hits",
        threshold=1.0,
        description="ClamAV signature hit detected",
    ),
    BuiltinDetector(
        tripwire="malware.yara_hits",
        feature="malware.yara_hits",
        threshold=0.5,
        description="YARA rule matched on protected path",
    ),
    BuiltinDetector(
        tripwire="malware.unsigned_binaries",
        feature="malware.unsigned_binaries",
        threshold=1.0,
        description="Unsigned binary executed from writable path",
    ),
    BuiltinDetector(
        tripwire="malware.setuid_change",
        feature="malware.setuid_change",
        threshold=1.0,
        description="Unexpected setuid change detected",
    ),
    BuiltinDetector(
        tripwire="fim.aide_deviation",
        feature="fim.aide_deviation",
        threshold=1.0,
        description="File integrity drift beyond baseline",
    ),
    BuiltinDetector(
        tripwire="intrusion.ssh_bruteforce",
        feature="intrusion.ssh_bruteforce",
        threshold=0.5,
        description="SSH brute-force heuristic triggered",
    ),
    BuiltinDetector(
        tripwire="ddos.syn_rate",
        feature="ddos.syn_rate",
        threshold=100.0,
        description="SYN flood signature detected",
    ),
    BuiltinDetector(
        tripwire="ddos.udp_flood",
        feature="ddos.udp_flood",
        threshold=50.0,
        description="UDP flood signature detected",
    ),
    BuiltinDetector(
        tripwire="http.error_rate",
        feature="http.error_rate",
        threshold=0.2,
        description="HTTP error rate spike",
    ),
    BuiltinDetector(
        tripwire="http.user_agent_anomaly",
        feature="http.user_agent_anomaly",
        threshold=0.3,
        description="Suspicious HTTP user-agent profile",
    ),
    BuiltinDetector(
        tripwire="exfil.long_lived_outbound",
        feature="exfil.long_lived_outbound",
        threshold=40.0,
        description="Potential data exfiltration via long-lived outbound",
    ),
    BuiltinDetector(
        tripwire="exfil.dns_tunnel_score",
        feature="exfil.dns_tunnel_score",
        threshold=0.5,
        description="DNS tunneling heuristics exceeded",
    ),
    BuiltinDetector(
        tripwire="wireguard.anomaly",
        feature="wireguard.anomaly",
        threshold=0.5,
        description="Admin traffic attempted outside WireGuard tunnel",
    ),
    BuiltinDetector(
        tripwire="services.restarts",
        feature="services.restarts",
        threshold=3.0,
        description="Critical service restarted repeatedly",
    ),
    BuiltinDetector(
        tripwire="auth.failures_ratio",
        feature="auth.failures",
        threshold=50.0,
        description="Authentication failure baseline exceeded",
        compute=_ratio("auth.failures", "events.auth_logs", scale=10.0),
    ),
]


@dataclass(slots=True)
class RuleEngine:
    """Evaluates deterministic tripwires against feature windows."""

    rules: List[RuleConfig]

    @classmethod
    def from_config(cls, rules: List[RuleConfig]) -> "RuleEngine":
        logger.debug(
            "Initializing RuleEngine",
            extra={"sentinel_context": {"rule_count": len(rules), "builtin": len(BUILTIN_DETECTORS)}},
        )
        return cls(rules=rules)

    def evaluate(self, features: Dict[str, float]) -> List[RuleHit]:
        """Evaluate deterministic rules against the latest features."""

        hits: List[RuleHit] = []
        triggered = set()
        for detector in BUILTIN_DETECTORS:
            value = detector.evaluate(features)
            if value >= detector.threshold:
                triggered.add(detector.tripwire)
                hit = RuleHit(tripwire=detector.tripwire, score=value, reason=detector.description)
                hits.append(hit)
                logger.info(
                    "Builtin detector triggered",
                    extra={
                        "sentinel_context": {
                            "tripwire": detector.tripwire,
                            "value": value,
                            "threshold": detector.threshold,
                        }
                    },
                )
        for rule in self.rules:
            if not rule.enabled:
                logger.debug(
                    "Rule disabled",
                    extra={"sentinel_context": {"tripwire": rule.tripwire}},
                )
                continue
            if rule.tripwire in triggered:
                continue
            value = features.get(rule.tripwire, 0.0)
            threshold = float(rule.threshold or 0)
            if threshold > 0 and value >= threshold:
                hit = RuleHit(
                    tripwire=rule.tripwire,
                    score=value,
                    reason=rule.description,
                )
                hits.append(hit)
                logger.info(
                    "Rule triggered",
                    extra={
                        "sentinel_context": {
                            "tripwire": rule.tripwire,
                            "value": value,
                            "threshold": threshold,
                        }
                    },
                )
            else:
                logger.debug(
                    "Rule evaluated",
                    extra={
                        "sentinel_context": {
                            "tripwire": rule.tripwire,
                            "value": value,
                            "threshold": threshold,
                        }
                    },
                )
        return hits
