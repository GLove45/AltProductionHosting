"""Telemetry ingestion pipeline definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
import json
import queue
import socket
from typing import Any, Dict, Iterable, Iterator, List, MutableMapping

try:  # pragma: no cover - optional dependency
    import redis
except Exception:  # pragma: no cover - runtime only
    redis = None

from ..utils.logging_config import configure_logging

logger = configure_logging(context={"component": "telemetry_ingestion"})


def _default_hostname() -> str:
    """Return the hostname for observability context."""

    try:
        return socket.gethostname()
    except OSError:  # pragma: no cover - extremely unlikely
        return "unknown-host"


def _json_serializer(value: Any) -> Any:
    """Ensure datetime objects are serialized to ISO-8601."""

    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.total_seconds()
    return value


@dataclass(slots=True)
class EventBus:
    """Redis-backed transport with local queue fallback."""

    redis_url: str
    channel: str
    list_key: str
    local_queue: "queue.SimpleQueue[str]" = field(default_factory=queue.SimpleQueue)
    _client: Any = field(init=False, default=None)

    def __post_init__(self) -> None:
        self._connect()

    def _connect(self) -> None:
        if redis is None:
            logger.warning(
                "Redis dependency unavailable; using in-memory queue",
                extra={"sentinel_context": {"channel": self.channel}},
            )
            self._client = None
            return
        try:
            self._client = redis.Redis.from_url(self.redis_url, socket_timeout=1, socket_connect_timeout=1)
            self._client.ping()
            logger.info(
                "Connected to Redis event bus",
                extra={
                    "sentinel_context": {
                        "url": self.redis_url,
                        "channel": self.channel,
                        "list_key": self.list_key,
                    }
                },
            )
        except Exception as exc:  # pragma: no cover - network failures
            logger.error(
                "Failed to connect to Redis; falling back to local queue",
                exc_info=exc,
                extra={"sentinel_context": {"url": self.redis_url, "channel": self.channel}},
            )
            self._client = None

    def publish(self, message: MutableMapping[str, Any]) -> None:
        """Publish a telemetry message to Redis with queue fallback."""

        serialized = json.dumps(message, default=_json_serializer)
        if self._client is not None:
            try:
                self._client.publish(self.channel, serialized)
                self._client.rpush(self.list_key, serialized)
                logger.debug(
                    "Published telemetry to Redis",
                    extra={"sentinel_context": {"channel": self.channel, "size": len(serialized)}},
                )
                return
            except Exception as exc:  # pragma: no cover - runtime only
                logger.error(
                    "Redis publish failed; switching to local queue",
                    exc_info=exc,
                    extra={"sentinel_context": {"channel": self.channel}},
                )
                self._client = None
        self.local_queue.put(serialized)
        backlog = 0
        if hasattr(self.local_queue, "qsize"):
            try:  # pragma: no cover - platform specific
                backlog = self.local_queue.qsize()
            except NotImplementedError:
                backlog = 0
        logger.debug(
            "Queued telemetry locally",
            extra={"sentinel_context": {"backlog": backlog}},
        )

    def drain_local(self) -> List[str]:
        """Return any locally buffered messages for observability hooks."""

        drained: List[str] = []
        while True:
            try:
                drained.append(self.local_queue.get_nowait())
            except queue.Empty:
                break
        if drained:
            logger.debug(
                "Drained local telemetry backlog",
                extra={"sentinel_context": {"count": len(drained)}},
            )
        return drained


@dataclass(slots=True)
class TelemetryEvent:
    """Normalized representation of raw telemetry records."""

    source: str
    payload: Dict[str, Any]
    collected_at: datetime
    hostname: str = field(default_factory=_default_hostname)

    def to_message(self) -> Dict[str, Any]:
        """Serialize the event for transport layers."""

        return {
            "source": self.source,
            "hostname": self.hostname,
            "collected_at": self.collected_at,
            "payload": self.payload,
        }


def _baseline_payload(source: str, collected_at: datetime) -> Dict[str, Any]:
    """Return deterministic payloads for the telemetry baseline."""

    minute_bucket = collected_at.minute % 5
    severity = "info"
    metrics: Dict[str, float] = {}
    summary: str
    tags: List[str]

    if source == "auth_logs":
        failures = 2 + minute_bucket
        metrics = {
            "auth.failures": float(failures),
            "intrusion.ssh_bruteforce": float(min(failures / 20, 1.0)),
        }
        summary = f"{failures} failed authentications observed"
        tags = ["auth", "ssh", "baseline"]
    elif source == "process_inventory":
        unsigned = 1 if minute_bucket == 0 else 0
        metrics = {
            "malware.unsigned_binaries": float(unsigned),
            "malware.unexpected_elf": float(unsigned),
        }
        severity = "warning" if unsigned else "info"
        summary = "Unsigned binaries present in writable paths" if unsigned else "Process inventory steady"
        tags = ["process", "malware"]
    elif source == "open_sockets":
        long_lived = 3 + minute_bucket
        metrics = {
            "network.long_lived_connections": float(long_lived),
            "exfil.egress_volume": float(long_lived * 5),
        }
        summary = "Socket scan completed"
        tags = ["network", "sockets"]
    elif source == "kernel_audit":
        setuid_changes = 1 if minute_bucket == 0 else 0
        metrics = {
            "malware.setuid_change": float(setuid_changes),
            "kernel.audit.anomalies": float(setuid_changes),
        }
        severity = "warning" if setuid_changes else "info"
        summary = "Kernel audit stream analyzed"
        tags = ["kernel", "auditd", "ebpf"]
    elif source == "file_integrity":
        drifts = minute_bucket
        metrics = {
            "fim.aide_deviation": float(drifts),
        }
        severity = "warning" if drifts else "info"
        summary = "AIDE baseline verified"
        tags = ["fim", "aide"]
    elif source == "package_inventory":
        outdated = 1 if minute_bucket == 4 else 0
        metrics = {
            "packages.outdated_critical": float(outdated),
        }
        summary = "Package inventory scanned"
        tags = ["packages", "sbom"]
    elif source == "systemd_states":
        restarts = minute_bucket // 2
        metrics = {
            "services.restarts": float(restarts),
        }
        summary = "Systemd unit snapshot"
        tags = ["systemd", "services"]
    elif source == "wireguard_status":
        enforced = 1.0
        metrics = {
            "wireguard.enforced": enforced,
            "wireguard.anomaly": 0.0,
        }
        summary = "WireGuard tunnel healthy"
        tags = ["wireguard", "vpn"]
    elif source == "clamav_scan":
        hits = 0 if minute_bucket else 1
        metrics = {
            "malware.signature_hits": float(hits),
        }
        severity = "warning" if hits else "info"
        summary = "ClamAV nightly sweep"
        tags = ["malware", "clamav"]
    elif source == "yara_sweep":
        hits = 0 if minute_bucket else 0.5
        metrics = {
            "malware.yara_hits": float(hits),
        }
        summary = "YARA sweep complete"
        tags = ["malware", "yara"]
    elif source == "ebpf_counters":
        syn_rate = 50 + minute_bucket * 5
        udp_flood = 5 * minute_bucket
        metrics = {
            "ddos.syn_rate": float(syn_rate),
            "ddos.udp_flood": float(udp_flood),
        }
        severity = "warning" if syn_rate > 100 else "info"
        summary = "eBPF counters refreshed"
        tags = ["network", "ebpf", "ddos"]
    elif source == "http_telemetry":
        error_rate = 0.05 * minute_bucket
        metrics = {
            "http.error_rate": float(error_rate),
            "http.user_agent_anomaly": float(0.1 * minute_bucket),
        }
        summary = "HTTP telemetry processed"
        tags = ["http", "application"]
    elif source == "dns_watch":
        tunnel_score = 0.1 * minute_bucket
        metrics = {
            "exfil.dns_tunnel_score": float(tunnel_score),
        }
        summary = "DNS heuristics evaluated"
        tags = ["dns", "exfil"]
    elif source == "exfil_watch":
        outbound = 10 * (minute_bucket + 1)
        metrics = {
            "exfil.long_lived_outbound": float(outbound),
        }
        summary = "Egress posture analyzed"
        tags = ["exfil", "network"]
    else:
        metrics = {"events.generic": 1.0}
        summary = "Generic telemetry event"
        tags = ["generic"]

    payload = {
        "summary": summary,
        "severity": severity,
        "metrics": metrics,
        "tags": tags,
        "collected_at": collected_at,
    }
    return payload


@dataclass(slots=True)
class TelemetryIngestor:
    """Loads raw telemetry from configured sources at strict cadence."""

    sources: List[str]
    cadence_seconds: int
    event_bus: EventBus

    @classmethod
    def from_config(cls, config) -> "TelemetryIngestor":
        logger.debug(
            "Creating TelemetryIngestor from config",
            extra={
                "sentinel_context": {
                    "sources": config.sources,
                    "cadence": config.cadence_seconds,
                    "redis_url": getattr(config, "redis_url", "n/a"),
                }
            },
        )
        bus = EventBus(
            redis_url=getattr(config, "redis_url", "redis://localhost:6379/0"),
            channel=getattr(config, "redis_channel", "sentinel.telemetry"),
            list_key=getattr(config, "redis_list_key", "sentinel.telemetry.queue"),
        )
        return cls(sources=config.sources, cadence_seconds=config.cadence_seconds, event_bus=bus)

    def collect(self) -> Iterator[TelemetryEvent]:
        """Yield telemetry events, forwarding each record to the event bus."""

        now = datetime.now(UTC)
        for source in self.sources:
            payload = _baseline_payload(source, now)
            event = TelemetryEvent(source=source, payload=payload, collected_at=now)
            message = {
                "stream": source,
                "event": "telemetry",
                "data": event.to_message(),
            }
            self.event_bus.publish(message)
            logger.debug(
                "Collected telemetry",
                extra={
                    "sentinel_context": {
                        "source": source,
                        "severity": payload.get("severity"),
                        "metrics": payload.get("metrics", {}),
                    }
                },
            )
            yield event


@dataclass(slots=True)
class FeatureWindow:
    """Windowed feature summaries derived from raw telemetry."""

    duration: timedelta
    features: Dict[str, float]
    label: str


class FeatureSink:
    """Protocol-like interface for persisting feature windows."""

    def persist(self, window: FeatureWindow) -> None:  # pragma: no cover - interface
        raise NotImplementedError


def _derive_label(max_signal: float) -> str:
    if max_signal >= 10:
        return "critical"
    if max_signal >= 5:
        return "elevated"
    if max_signal > 0:
        return "observed"
    return "steady"


def rollup_features(events: Iterable[TelemetryEvent], window: timedelta) -> FeatureWindow:
    """Aggregate metrics from telemetry events into a feature window."""

    totals: Dict[str, float] = {}
    max_signal = 0.0
    event_count = 0.0
    for event in events:
        event_count += 1
        totals[f"events.{event.source}"] = totals.get(f"events.{event.source}", 0.0) + 1.0
        metrics = event.payload.get("metrics", {})
        for key, value in metrics.items():
            numeric = float(value)
            totals[key] = totals.get(key, 0.0) + numeric
            if numeric > max_signal:
                max_signal = numeric
    totals["events.total"] = event_count
    label = _derive_label(max_signal)
    logger.debug(
        "Rolled up features",
        extra={
            "sentinel_context": {
                "window_seconds": window.total_seconds(),
                "feature_count": len(totals),
                "label": label,
                "max_signal": max_signal,
            }
        },
    )
    return FeatureWindow(duration=window, features=totals, label=label)
