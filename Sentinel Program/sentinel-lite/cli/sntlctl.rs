//! Sentinel Lite local control CLI (Rust prototype).
//!
//! Provides administrative actions via a Unix domain socket to the running
//! agent. Planned subcommands include:
//! * `status` – query agent heartbeat and component health.
//! * `tail` – follow recent event logs for troubleshooting.
//! * `test-rule` – execute a detector rule in isolation.
//! * `dry-run` – simulate a responder playbook without enacting changes.
//! * `isolate` / `rejoin` – toggle network isolation with MFA confirmation.
//!
//! ## Authentication and Authorization
//! * Integrate with PAM or TOTP for multi-factor prompts.
//! * Enforce RBAC policies defining which local roles can execute commands.
//!
//! ## Implementation Notes
//! The production CLI remains Python, but this Rust scaffold captures the
//! intended feature parity should we port administrative tooling in the future.
