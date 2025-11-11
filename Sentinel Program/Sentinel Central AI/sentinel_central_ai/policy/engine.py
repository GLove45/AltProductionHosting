"""Policy engine that merges rule hits and anomaly scores."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import logging
from dataclasses import dataclass, field
from typing import Dict, List

from ..config import PolicyThresholds
from ..rules.engine import RuleEngine, RuleHit
from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "policy_engine"})

APPROVAL_WINDOW = timedelta(minutes=30)

PLAYBOOK_LIBRARY: Dict[str, List[str]] = {
    "malware.signature_hits": [
        "Kill offending process",
        "Quarantine binary with chattr +i",
        "Isolate host WireGuard peer",
        "Snapshot evidence bundle",
    ],
    "malware.yara_hits": [
        "Kill offending process",
        "Quarantine binary with chattr +i",
        "Schedule full disk sweep",
    ],
    "malware.unsigned_binaries": [
        "Suspend process",
        "Mark binary for manual review",
        "Enable heightened telemetry",
    ],
    "malware.setuid_change": [
        "Revert setuid bits",
        "Trigger forensic capture",
        "Notify security operations",
    ],
    "fim.aide_deviation": [
        "Run targeted AIDE recheck",
        "Seal tampered file via chattr +i",
        "Snapshot filesystem metadata",
    ],
    "intrusion.ssh_bruteforce": [
        "Enable SSH tarpitting",
        "Ban offending IP via nftables",
        "Escalate to phone approval challenge",
    ],
    "ddos.syn_rate": [
        "Deploy SYN cookie profile",
        "Raise XDP drop rate",
        "Flip admin endpoints to WireGuard-only",
    ],
    "ddos.udp_flood": [
        "Enable UDP drop profile",
        "Notify upstream partner",
        "Throttle rate limits",
    ],
    "http.error_rate": [
        "Apply WAF mitigation rules",
        "Block abusive fingerprint",
        "Serve cached responses",
    ],
    "http.user_agent_anomaly": [
        "Challenge suspicious sessions",
        "Enable strict bot detection",
    ],
    "exfil.dns_tunnel_score": [
        "Block suspicious domains",
        "Force WireGuard-only egress",
        "Alert human operator",
    ],
    "exfil.long_lived_outbound": [
        "Cut non-approved egress",
        "Capture packet trace",
        "Notify compliance channel",
    ],
    "packages.outdated_critical": [
        "Stage security updates",
        "Notify patch management",
    ],
    "services.restarts": [
        "Pin service state",
        "Escalate to service owner",
    ],
}


def _playbook_for_hit(hit: RuleHit) -> List[str]:
    return PLAYBOOK_LIBRARY.get(hit.tripwire) or PLAYBOOK_LIBRARY.get(hit.reason, [])


@dataclass(slots=True)
class PolicyDecision:
    """Outcome of policy evaluation."""

    action: str
    confidence: float
    rationale: str
    rule_hits: List[RuleHit]
    anomaly_scores: Dict[str, float]
    playbooks: Dict[str, List[str]] = field(default_factory=dict)
    requires_approval: bool = True
    approval_deadline: datetime | None = None


@dataclass(slots=True)
class PolicyEngine:
    """Combines deterministic rules and anomaly scores into an action."""

    rule_engine: RuleEngine
    thresholds: PolicyThresholds

    def evaluate(self, anomaly_scores: Dict[str, float]) -> PolicyDecision:
        """Compute the final policy action."""

        features = {**anomaly_scores}
        rule_hits = self.rule_engine.evaluate(features)
        anomaly_values = [value for key, value in anomaly_scores.items() if key.startswith("anomaly.")]
        max_rule_score = max([hit.score for hit in rule_hits] or [0.0])
        max_score = max(anomaly_values + [max_rule_score] or [0.0])
        if max_score >= self.thresholds.lockdown:
            action = "lockdown"
        elif max_score >= self.thresholds.quarantine:
            action = "quarantine"
        elif max_score >= self.thresholds.require_elevated:
            action = "require_elevated"
        else:
            action = "allow"
        playbook_mapping: Dict[str, List[str]] = {
            hit.tripwire: _playbook_for_hit(hit) for hit in rule_hits if _playbook_for_hit(hit)
        }
        approval_deadline = None
        requires_approval = action != "allow"
        if requires_approval:
            approval_deadline = datetime.now(UTC) + APPROVAL_WINDOW
        rationale = (
            f"Max score {max_score:.2f} across rules/anomalies; thresholds="
            f"(elevated={self.thresholds.require_elevated}, "
            f"quarantine={self.thresholds.quarantine}, "
            f"lockdown={self.thresholds.lockdown})"
        )
        decision = PolicyDecision(
            action=action,
            confidence=max_score,
            rationale=rationale,
            rule_hits=rule_hits,
            anomaly_scores=anomaly_scores,
            playbooks=playbook_mapping,
            requires_approval=requires_approval,
            approval_deadline=approval_deadline,
        )
        logger.info(
            "Policy decision computed",
            extra={
                "sentinel_context": {
                    "action": action,
                    "confidence": max_score,
                    "rule_hits": [hit.tripwire for hit in rule_hits],
                    "requires_approval": requires_approval,
                }
            },
        )
        return decision
