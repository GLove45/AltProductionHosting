//! Persistent evidence vault for Sentinel Lite.
//!
//! Responsibilities:
//! - Maintain append-only logs for events and actions with per-record signatures.
//! - Emit a daily digest file summarizing record hashes for remote attestation.
//! - Coordinate durable storage for investigations and export pipelines.
//!
//! ## Storage Layout
//! * `logs/events.log` – chronological event entries with associated Ed25519 signatures.
//! * `logs/actions.log` – operator or automated remediation history (also signed).
//! * `digest/YYYY-MM-DD.hash` – Merkle-root digest of the day's records.
//!
//! ## Inputs
//! * Findings from detectors.
//! * Actions from responder playbooks.
//! * Snapshots from periodic baselines.
//!
//! ## Open Research Questions
//! * Determine an fsync strategy that balances durability with flash wear.
//! * Ensure power-loss safety when multiple writers enqueue evidence concurrently.
//! * Deduplicate repeated findings while preserving the original record ordering.
//! * Evaluate lightweight compression (zstd?) for historical archives.
//!
//! ## Implementation Notes
//! The Rust implementation is expected to wrap a write-ahead log abstraction with
//! per-record signing.  This file intentionally contains documentation comments
//! only so downstream teams have a canonical design reference before coding.
