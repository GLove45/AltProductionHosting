# Sentinel Central AI Infrastructure

This module provides the foundational infrastructure for the Sentinel Central AI platform. It bootstraps the coordinator and sensor nodes, implements verbose observability, and maps out core interfaces for ingest, feature extraction, rules, policy actions, human-in-the-loop feedback, UI coordination, and phone-based approvals.

## Components

- **Coordinator services** orchestrate policy evaluation, storage, UI delivery, and approval flows.
- **Sensor and inference services** ingest raw telemetry, compute feature windows, and dispatch anomaly scoring workloads to the AI HAT accelerator.
- **Rules and policy engines** combine deterministic tripwires with anomaly scores to recommend actions.
- **Learning feedback loop** captures human decisions and promotes vetted automations.
- **UI façade** exposes a single-pane operational view backed by approval tokens.
- **Phone contract definitions** document REST payloads for registration, challenge, approvals, alerts, and revocation.

The Python package is designed for high-verbosity execution so early operators can trace every decision path and extend the system without refactoring.
