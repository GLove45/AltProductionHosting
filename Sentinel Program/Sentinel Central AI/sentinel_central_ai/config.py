"""Declarative configuration models for Sentinel Central AI."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Dict, List


@dataclass(slots=True)
class StorageConfig:
    """Persistence configuration for features, decisions, and digests."""

    engine: str = "sqlite"
    dsn: str = "sqlite:///var/sentinel/features.db"
    audit_log_path: str = "var/sentinel/audit.log"
    digest_interval: timedelta = timedelta(hours=1)


@dataclass(slots=True)
class TelemetryConfig:
    """Sensor telemetry ingestion definition."""

    cadence_seconds: int = 1
    redis_url: str = "redis://localhost:6379/0"
    redis_channel: str = "sentinel.telemetry"
    redis_list_key: str = "sentinel.telemetry.queue"
    sources: List[str] = field(
        default_factory=lambda: [
            "auth_logs",
            "process_inventory",
            "open_sockets",
            "kernel_audit",
            "file_integrity",
            "package_inventory",
            "systemd_states",
            "wireguard_status",
            "clamav_scan",
            "yara_sweep",
            "ebpf_counters",
            "http_telemetry",
            "dns_watch",
            "exfil_watch",
        ]
    )


@dataclass(slots=True)
class InferenceConfig:
    """Configuration for AI HAT inference workloads."""

    batch_interval: timedelta = timedelta(seconds=5)
    accelerator_profile: Dict[str, str] = field(
        default_factory=lambda: {
            "device": "ai_hat",
            "tops_budget": "50%",
            "priority": "anomaly_scoring",
        }
    )


@dataclass(slots=True)
class SensorNodeConfig:
    """Aggregate configuration for the sensor node."""

    host: str = "sensor.local"
    ingest_interval: timedelta = timedelta(seconds=1)
    telemetry: TelemetryConfig = field(default_factory=TelemetryConfig)
    inference: InferenceConfig = field(default_factory=InferenceConfig)


@dataclass(slots=True)
class RuleConfig:
    """Describes the deterministic rules deployed on day zero."""

    enabled: bool = True
    tripwire: str = ""
    threshold: float | int | None = None
    description: str = ""


@dataclass(slots=True)
class PolicyThresholds:
    """Threshold configuration for policy transitions."""

    require_elevated: float = 0.5
    quarantine: float = 0.7
    lockdown: float = 0.9


@dataclass(slots=True)
class PolicyConfig:
    """Coordinator policy settings."""

    mode: str = "allow"
    thresholds: PolicyThresholds = field(default_factory=PolicyThresholds)
    rules: List[RuleConfig] = field(
        default_factory=lambda: [
            RuleConfig(tripwire="malware.signature_hits", threshold=1, description="ClamAV signature hit"),
            RuleConfig(tripwire="malware.yara_hits", threshold=1, description="YARA rule match"),
            RuleConfig(tripwire="malware.unsigned_binaries", threshold=1, description="Unsigned binary execution"),
            RuleConfig(tripwire="malware.setuid_change", threshold=1, description="Setuid bit changed"),
            RuleConfig(tripwire="fim.aide_deviation", threshold=1, description="AIDE drift detected"),
            RuleConfig(tripwire="intrusion.ssh_bruteforce", threshold=1, description="SSH brute force"),
            RuleConfig(tripwire="ddos.syn_rate", threshold=120, description="SYN flood volume"),
            RuleConfig(tripwire="ddos.udp_flood", threshold=60, description="UDP flood volume"),
            RuleConfig(tripwire="http.error_rate", threshold=1, description="HTTP 4xx/5xx spike"),
            RuleConfig(tripwire="http.user_agent_anomaly", threshold=1, description="HTTP UA anomaly"),
            RuleConfig(tripwire="exfil.long_lived_outbound", threshold=80, description="Suspicious outbound"),
            RuleConfig(tripwire="exfil.dns_tunnel_score", threshold=1, description="DNS tunneling"),
            RuleConfig(tripwire="wireguard.anomaly", threshold=1, description="WireGuard enforcement bypass"),
            RuleConfig(tripwire="services.restarts", threshold=4, description="Service restart storm"),
        ]
    )


@dataclass(slots=True)
class LearningConfig:
    """Feedback loop tuning parameters."""

    windows: List[timedelta] = field(
        default_factory=lambda: [timedelta(minutes=1), timedelta(minutes=5), timedelta(hours=1)]
    )


@dataclass(slots=True)
class CoordinatorConfig:
    """Coordinator node configuration."""

    host: str = "coordinator.local"
    ui_endpoint: str = "https://coordinator.local:8443"
    approvals_api: str = "https://coordinator.local:8443/approvals"
    storage_engine: str = "sqlite"


@dataclass(slots=True)
class SensorConfig:
    """Alias for backward compatibility with bootstrap imports."""

    host: str = "sensor.local"


@dataclass(slots=True)
class SentinelConfig:
    """Container for all Sentinel Central AI configuration domains."""

    coordinator: CoordinatorConfig = field(default_factory=CoordinatorConfig)
    sensor: SensorNodeConfig = field(default_factory=SensorNodeConfig)
    storage: StorageConfig = field(default_factory=StorageConfig)
    policy: PolicyConfig = field(default_factory=PolicyConfig)
    learning: LearningConfig = field(default_factory=LearningConfig)

    @classmethod
    def default(cls) -> "SentinelConfig":
        """Return a sensible day-zero configuration."""

        return cls()
