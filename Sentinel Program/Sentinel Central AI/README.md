# Sentinel Central AI Infrastructure

This module provides the foundational infrastructure for the Sentinel Central AI platform. It bootstraps the coordinator and sensor nodes, implements verbose observability, and maps out core interfaces for ingest, feature extraction, rules, policy actions, human-in-the-loop feedback, UI coordination, and phone-based approvals.

The Python package is designed for high-verbosity execution so early operators can trace every decision path and extend the system without refactoring.

---

## Architectural Overview

Sentinel Central AI is organized as a closed-loop security orchestration system that continuously ingests telemetry, derives higher-order signals, evaluates automated policy, and incorporates human feedback:

1. **Telemetry ingest** – `IngestPipeline` coordinates the `TelemetryIngestor` and `FeatureStore` to roll telemetry into feature windows while mirroring records onto Redis or an in-memory queue for replay and auditability.
2. **Feature persistence** – the `FeatureStore` streams feature windows into SQLite with an append-only audit log, enabling rapid retrieval and UI snapshots without sacrificing traceability.
3. **Inference** – the `InferenceEngine` scores the latest feature snapshot, emitting raw and anomaly-prefixed metrics that mimic AI HAT accelerator outputs and drive downstream policy thresholds.
4. **Deterministic rules** – the `RuleEngine` blends built-in detectors with configurable tripwires, providing rationale-rich rule hits whenever thresholds are crossed.
5. **Policy and playbooks** – `PolicyEngine` unifies anomaly scores and rule hits into a decision, computes approval deadlines, and surfaces structured playbook suggestions per tripwire.
6. **Human feedback loop** – `FeedbackLoop` captures operator actions, maintains Bayesian trust, detects baseline drift, and produces automation promotion candidates that can tune policy thresholds over time.
7. **Coordinator and UI façade** – `Coordinator` centralizes decision state, alerting, latency tracking, and feedback persistence while the `Dashboard` exposes this posture to the SPA and phone workflows.
8. **Phone contracts** – `approvals_contracts` documents the REST payloads powering device registration, challenge generation, approvals, and revocations used by Sentinel Phone clients.
9. **Bootstrap orchestration** – `bootstrap_environment` wires every component using `SentinelConfig`, emits verbose logs for day-zero bring-up, and returns a `BootstrapContext` used by demos or service runners.

The `main.run_demo` entry point stitches these stages together, simulating a full ingest→inference→policy→feedback loop for operator onboarding and integration testing.

---

## Current Capabilities

- **High-fidelity telemetry baseline** – deterministic payload generators span authentication, process, network, kernel, FIM, malware, HTTP, DNS, and egress sources, ensuring coverage across Sentinel’s core security pillars without external dependencies.
- **Audit-ready feature persistence** – persisted feature windows maintain both in-memory and SQLite representations while writing JSON audit trails, supporting forensic reconstruction and compliance needs.
- **Composable rule framework** – built-in detectors cover 15+ high-signal tripwires and seamlessly mix with configurable `RuleConfig` entries loaded from `SentinelConfig` defaults.
- **Rich policy outputs** – policy decisions attach contextual rationale, per-rule playbooks, approval timers, and severity mapping that feed UI alerts and phone approval tokens.
- **Feedback-driven learning** – the feedback loop tracks trust per action/indicator/source, flags baseline drift, and adjusts policy thresholds based on automation success, laying groundwork for adaptive governance.
- **Unified operator experience** – the coordinator emits alert timelines, decision consoles, and feature snapshots consumed by the dashboard, giving analysts a single-pane view enriched with automation suggestions.
- **Phone-based approvals** – strongly typed dataclasses describe registration, challenge, approval, and revocation lifecycles alongside offline fallbacks so mobile flows can be implemented consistently.
- **Extensible configuration** – dataclass-backed config surfaces coordinator, sensor, storage, policy, and learning defaults that can be overridden per deployment or tuned dynamically via the feedback loop.

---

## Suggested Improvements & R&D Focus

1. **Real-time streaming adapters** – implement async collectors for live Redis/pub-sub and Kafka topics so Sentinel can transition from simulated baselines to production telemetry with backpressure control.
2. **Model-based anomaly scoring** – replace linear anomaly mirroring in `InferenceEngine` with pluggable ML models (e.g., on-device ONNX runtimes) and persist model metadata alongside results for lineage tracking.
3. **Rule evaluation analytics** – expose per-rule hit rates, false positive ratios, and drift statistics in the dashboard to guide tuning and inform automated suppression logic.
4. **Approval policy hardening** – integrate device posture attestation checks and enforce offline challenge expiry in `approvals_contracts` to minimize token abuse windows.
5. **Feedback-loop retraining hooks** – serialize curated feedback into a feature-label dataset and trigger offline retraining jobs for anomaly detectors when drift persists.
6. **Resilience & HA** – add coordinator failover primitives (persistent alert queue, decision journal) and sensor-side buffering to survive Redis outages beyond in-memory fallbacks.
7. **Security testing automation** – embed red-team scenario generators that feed synthetic attacks through the ingest pipeline to validate rule coverage and calibration on every release.

---

## File Inventory

| Path | Purpose |
| --- | --- |
| `README.md` | This document – comprehensive overview of Sentinel Central AI infrastructure, capabilities, and roadmap. |
| `sentinel_central_ai/__init__.py` | Package entry that exposes the bootstrap routine for external callers. |
| `sentinel_central_ai/bootstrap.py` | Constructs every core component from configuration, announces initialized services, and returns a `BootstrapContext`. |
| `sentinel_central_ai/main.py` | Demo runner that executes a full ingest→inference→policy→feedback loop for local validation. |
| `sentinel_central_ai/config.py` | Dataclass-backed configuration models covering storage, sensors, policy thresholds, and learning windows. |
| `sentinel_central_ai/coordinator/services.py` | Coordinator service definitions handling policy evaluation, alerting, feedback logging, and decision console exposure. |
| `sentinel_central_ai/data/feature_store.py` | SQLite-backed feature sink with audit logging, rollup retrieval, and snapshot utilities. |
| `sentinel_central_ai/data/ingestion_pipeline.py` | Telemetry collection, event transport, feature rollup logic, and feature window abstractions. |
| `sentinel_central_ai/learning/feedback.py` | Feedback loop models capturing operator decisions, drift detection, and threshold tuning heuristics. |
| `sentinel_central_ai/policy/engine.py` | Policy decision engine combining rules and anomaly scores with playbook enrichment and approval deadlines. |
| `sentinel_central_ai/phone/approvals_contracts.py` | Dataclass contracts and helpers defining device registration, challenge, approval, and revoke payloads for mobile clients. |
| `sentinel_central_ai/rules/engine.py` | Rule evaluation framework with built-in detectors, configurable rules, and rich hit reporting. |
| `sentinel_central_ai/sensor/ingest.py` | Sensor ingest pipeline that triggers telemetry collection and persists feature windows every interval. |
| `sentinel_central_ai/sensor/inference.py` | Inference orchestration translating feature snapshots into anomaly scores and batch metadata. |
| `sentinel_central_ai/ui/dashboard.py` | Dashboard façade delivering posture snapshots, timelines, and decision console data to the SPA layer. |
| `sentinel_central_ai/utils/logging_config.py` | Centralized logging helper that enforces verbose context-rich log formatting across components. |

---

## Next Steps

Teams adopting Sentinel Central AI should begin by integrating real telemetry sources via `TelemetryIngestor`, layering production-grade storage backends, and iteratively tuning rule thresholds using the feedback loop’s insights. The demo runner (`python -m sentinel_central_ai.main`) remains a valuable reference for verifying wiring before deploying onto coordinated Pi clusters.
