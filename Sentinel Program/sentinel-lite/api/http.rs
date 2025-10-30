//! Embedded HTTP API for Sentinel Lite.
//!
//! Endpoints (read-only):
//! * `/health` – returns component status summary.
//! * `/events` – streams the tail of the evidence vault.
//! * `/policy` – exposes the effective merged policy for transparency.
//! * `/metrics` – publishes Prometheus-friendly counters.
//!
//! ## Design Goals
//! * Bind to localhost and authenticate callers via Unix-socket forwarded
//!   tokens or group membership checks.
//! * Rate-limit requests to prevent local abuse or scraping.
//! * Do not persist additional data; reuse the agent's in-memory state.
//!
//! Implementation TBD pending API security review.
