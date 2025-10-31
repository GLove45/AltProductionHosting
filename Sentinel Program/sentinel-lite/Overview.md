# Sentinel Lite Program Overview

## Mission Summary
Sentinel Lite is an autonomous host security platform that blends a Rust-based
daemon with Python orchestration tooling. The system watches process integrity,
network egress, authentication activity, and filesystem drift, then correlates
the signals into actionable findings that can trigger containment, isolation, or
observation playbooks. Evidence is preserved locally with tamper-evident
signatures and can be exported to central operators over authenticated channels.

## Execution Topology
- **Rust agent (`agent/`)**: Runs as a systemd-notified service, enforcing policy
  checks, routing telemetry, and maintaining tamper-evident state.
- **Python runtime (`sentinelctl.py`)**: Provides the production control plane
  for collectors, integrity checks, and reporting.
- **Collectors (`collectors/`)**: Modular Rust components for auth, filesystem,
  health, network, and process telemetry.
- **Detectors (`detectors/`)**: Rules, lightweight models, and escalation logic
  that translate raw telemetry into findings and response actions.
- **Responders (`responder/`)**: Containment playbooks for observe, constrain,
  and isolate actions.
- **Evidence pipeline (`evidence/`, `reporter.py`)**: Local vault plus export and
  reporting interfaces.
- **Configuration & policy (`policy.yaml`, `sentinel.conf`, `config/`,
  `manifest*.json`)**: Governs capabilities, thresholds, and integrity baselines.
- **Hardening & service glue (`sentinel-lite.service`, `apparmor.d/`)**:
  Systemd+AppArmor definitions wrapping the runtime.
- **Lifecycle artifacts (`updater/`, `state/`, `secrets/`, `docs/`)**: Support
  updates, persisted counters, secrets management, and operator guides.

## Component Reference

### Rust Autonomous Agent (`agent/`)
- **`Cargo.toml`** – Defines the `sentinel-lite-agent` crate, dependencies for
  cryptography, channels, filesystem notifications, systemd integration, and
  build metadata. 
- **`main.rs`** – Entry point that parses CLI flags, loads policy, instantiates
  crypto material, builds the event router, watches the policy file for SIGHUP
  reloads, logs router metrics, handles systemd readiness/watchdog pings, and
  validates policy structure before running the main loop.
- **`crypto.rs`** – Manages device signing keys, CA pinsets, tamper-evident
  record creation, transparency log chaining, anti-rollback counters, monotonic
  event counters, HMAC day keys, and file checksums while enforcing restrictive
  file permissions.
- **`router.rs`** – Configurable topic router that publishes serialized events to
  bounded channels, tracks sequence numbers, enforces drop accounting, exposes
  subscriber receivers, and reports per-topic depth/backpressure metrics.

### Telemetry Collectors (`collectors/`)
- **`auth.rs`** – Defines normalized authentication events and configuration,
  scaffolding journald, auth.log, and WireGuard polling with verbose tracing.
- **`fs.rs`** – Tracks watched paths, maintains Merkle baselines, and outlines
  snapshot/event handling for filesystem integrity monitoring.
- **`health.rs`** – Samples NVMe, thermal, and clock drift telemetry at scheduled
  intervals, logging poll counts and providing configuration defaults.
- **`net.rs`** – Builds flow records with optional DNS/SNI/ASN enrichment using
  conntrack data, highlighting default poll intervals and tracing instrumentation.
- **`proc.rs`** – Supports auditd or eBPF-backed process telemetry, buffering
  events, enriching from `/proc`, and maintaining configurable polling windows.

### Detection Stack (`detectors/`)
- **`ruleset.rs`** – Implements sliding-window state for auth bursts, daemon to
  shell spawning, filesystem changes, and ASN egress spikes, emitting structured
  findings.
- **`models.rs`** – Supplies optional flow density and login timing heuristics
  that emit scored findings when thresholds are exceeded.
- **`escalation.rs`** – Evaluates corroborated findings against allowed
  capabilities, enforces cooldowns, and escalates to observe/constrain/isolate
  levels with audit-friendly logging.

### Response Playbooks (`responder/`)
- **`observe.rs`** – Captures configuration snapshots into an evidence mirror
  while preserving directory structure and logging each copy.
- **`constrain.rs`** – Records reversible containment actions such as process
  tree kills, read-only remounts, and egress blocks in an append-only ledger.
- **`isolate.rs`** – Quarantines hosts by disabling WireGuard peers, enforcing
  default-drop policies, and writing a quarantine flag for operators.

### Python Control Plane & Services
- **`sentinelctl.py`** – Production runtime orchestrator that loads INI config,
  wires together reporter, netwatch, procguard, and integrity loops, handles
  threading and graceful shutdown, and exposes CLI commands (`start`,
  `force-scan`, `status`, `report`).
- **`integrity.py`** – Periodically verifies configured manifests, hashing files
  and emitting alerts for missing or mismatched entries.
- **`netwatch.py`** – Discovers the VPN endpoint via NordVPN JSON or Scapy,
  scans inet connections with psutil, and flags flows leaving the VPN or allowlist.
- **`procguard.py`** – Maintains SHA-256 baselines for critical executables,
  compares hashes, persists manifests, and optionally uses watchdog observers for
  realtime alerts.
- **`reporter.py`** – Queues alerts and dispatches them over HTTPS or SSH,
  appending all payloads to a local log and handling optional dependencies.

### Evidence & Export
- **`evidence/vault.rs`** – Documents the append-only evidence store layout,
  signature requirements, and durability considerations.
- **`evidence/export.rs`** – Outlines encrypted bundle export workflows,
  resumable transfers, and bandwidth management research topics.

### Update & Lifecycle
- **`updater/client.rs`** – Specifies the blue/green update strategy, signature
  verification, health checks, and outstanding questions about modelling TUF.
- **`hash_manifest.json` / `manifest.json`** – JSON manifests for process hashes
  and integrity checks, currently populated with placeholder entries.
- **`state/`** – Contains documentation for baseline snapshots, monotonic
  counters, and a placeholder anonymized host identifier.
- **`secrets/`** – Includes placeholders for the device signing key and optional
  MFA seed; provisioning steps must enforce strict permissions.

### Configuration & Policy Artifacts
- **`policy.yaml`** – Central capability policy covering metadata, surfaces,
  schedules, consent rules, thresholds, maintenance windows, suppressions, and
  validation requirements.
- **`sentinel.conf`** – Runtime INI configuration consumed by the Python control
  plane for networking, procguard, integrity, and reporting defaults.
- **`config/blocklists/*.txt`** – Curated ASN and domain blocklists with
  provenance notes; `config/truststore.pem` is a placeholder trust anchor.

### Service Hardening
- **`sentinel-lite.service`** – Systemd unit enabling watchdog, restart policy,
  privilege separation, AppArmor profile application, capability bounding, and
  filesystem protections.
- **`apparmor.d/sentinel-lite`** – Constrains filesystem access, network
  capabilities, proc visibility, nft execution, and denies sensitive paths.

### Documentation & Auxiliary Assets
- **`docs/Threat-Model.md`** – Lists assets, actors, and abuse cases that
  Sentinel Lite mitigates.
- **`docs/Runbooks.md`** – Provides operational procedures for installs,
  upgrades, incident response, and evidence handling.
- **`docs/Privacy-Consent.md`** – Summarizes telemetry scope and transparency
  requirements.
- **`logs/`** – Placeholder directory for runtime and reporter log output.

## Operational Flow
1. The systemd unit launches the Rust agent, which parses CLI arguments, loads
   policy and crypto material, creates router channels, and signals readiness.
2. Collectors (Rust) and Python subsystems feed normalized events into the
   router or directly queue alerts via the reporter and evidence vault.
3. Detection rules and lightweight models inspect event streams to generate
   findings, which the escalation policy evaluates for response actions.
4. Responders execute playbooks, while the reporter forwards alerts and the
   evidence vault records tamper-evident entries for audit/export.
5. Integrity, procguard, and netwatch loops continuously compare runtime state
   against manifests, blocklists, and network expectations, emitting alerts to
   the router and reporter for correlation.

## Improvement & Safeguarding Opportunities
1. **Complete collector implementations** – Flesh out journald, auditd, conntrack,
   and NVMe integrations to replace the current placeholders and realise full
   telemetry coverage.
2. **Harden manifest management** – Populate `hash_manifest.json` with signed
   hashes and enforce verification to avoid silent drift.
3. **Finalize evidence vault implementation** – Move documentation stubs into a
   production-ready append-only store with fsync strategy and concurrency guards.
4. **Implement updater client** – Deliver the blue/green rollout logic, signature
   checks, and rollback automation described in the updater specification.
5. **Add API surface controls** – Replace the HTTP API stub with an authenticated,
   rate-limited implementation to expose health, policy, and metrics securely.
6. **Expand reporter resilience** – Add retry, backoff, and queue persistence so
   alerts survive network outages and process restarts.
7. **Strengthen secrets handling** – Ensure provisioning workflows install
   device keys and MFA seeds with automated permission checks and rotation plans.
8. **Enforce configuration validation** – Introduce schema validation for
   `sentinel.conf`, blocklists, and manifests to catch operator errors early.
9. **Augment policy attestation** – Sign `policy.yaml` revisions and verify the
   signature in both the Rust agent and Python runtime before activation.
10. **Integrate continuous monitoring metrics** – Export Prometheus counters for
    router depth, collector health, and responder actions to improve observability.
