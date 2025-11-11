"""Declarative configuration models for Sentinel Central AI."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Dict, List


@dataclass(slots=True)
class StorageConfig:
    """Persistence configuration for features, decisions, and digests."""

    engine: str = "sqlite"
    dsn: str = "sqlite:///sentinel.db"
    digest_interval: timedelta = timedelta(hours=1)


@dataclass(slots=True)
class TelemetryConfig:
    """Sensor telemetry ingestion definition."""

    cadence_seconds: int = 1
    sources: List[str] = field(
        default_factory=lambda: [
            "auth_log",
            "sudo_events",
            "ssh_attempts",
            "process_snapshots",
            "listening_ports",
            "outbound_connections",
            "dns_queries",
            "system_metrics",
            "disk_smart",
            "service_restarts",
            "package_changes",
            "firewall_changes",
            "accelerator_health",
            "latency_probes",
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
            RuleConfig(tripwire="ssh_burst", threshold=10, description="SSH burst detection"),
            RuleConfig(tripwire="new_high_risk_listener", description="New listener on high-risk port"),
            RuleConfig(tripwire="sudoers_change", description="Change to sudoers or firewall"),
            RuleConfig(tripwire="unsigned_binary_execution", description="Unsigned binary execution"),
            RuleConfig(tripwire="outbound_non_whitelist", description="Outbound to non-whitelisted ASN/TLD"),
            RuleConfig(tripwire="dns_high_entropy", description="DNS to newly observed high entropy domain"),
            RuleConfig(tripwire="daemon_restart", description="Daemon restarts outside maintenance window"),
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
    ui_endpoint: str = "http://coordinator.local:8080"
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
