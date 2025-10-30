//! Authentication and privileged access collector for Sentinel Lite.
//!
//! This module focuses on Linux authentication sources such as journald,
//! `/var/log/auth.log`, and WireGuard peer updates.  The implementation keeps
//! the runtime lean while still emitting rich, normalized events for the
//! detection pipeline.  Verbose tracing can be enabled through the standard
//! `RUST_LOG` environment variable.

use std::path::PathBuf;
use std::time::{Duration, SystemTime};

use serde::Serialize;

/// Normalized authentication event emitted by the collector.
#[derive(Debug, Clone, Serialize)]
pub struct AuthEvent {
    pub user: String,
    pub source: String,
    pub success: bool,
    pub method: String,
    pub mfa: bool,
    pub off_hours: bool,
    pub timestamp: SystemTime,
}

/// Configuration for the authentication collector.
#[derive(Debug, Clone)]
pub struct AuthCollectorConfig {
    pub journal_cursor_file: PathBuf,
    pub auth_log_path: PathBuf,
    pub wg_interface: Option<String>,
    pub poll_interval: Duration,
}

impl Default for AuthCollectorConfig {
    fn default() -> Self {
        Self {
            journal_cursor_file: PathBuf::from("/var/lib/sentinel-lite/auth.cursor"),
            auth_log_path: PathBuf::from("/var/log/auth.log"),
            wg_interface: Some("wg0".into()),
            poll_interval: Duration::from_secs(15),
        }
    }
}

/// Authentication collector with journald + log fallback and optional WireGuard parsing.
pub struct AuthCollector {
    config: AuthCollectorConfig,
}

impl AuthCollector {
    pub fn new(config: AuthCollectorConfig) -> Self {
        tracing::info!(
            target: "collector::auth",
            ?config,
            "initializing authentication collector"
        );
        Self { config }
    }

    /// Poll journald, the legacy auth log, and WireGuard peers for updates.
    pub fn poll(&self) -> Vec<AuthEvent> {
        tracing::trace!(target: "collector::auth", "polling authentication sources");

        let mut events = Vec::new();

        // NOTE: Implementation details intentionally left as future work.
        // The method outlines how multiple sources will be merged while the
        // scaffolding provides structured, high-verbosity logging.
        self.poll_journal(&mut events);
        self.poll_auth_log(&mut events);
        self.poll_wireguard(&mut events);

        tracing::debug!(
            target: "collector::auth",
            count = events.len(),
            "authentication poll complete"
        );
        events
    }

    fn poll_journal(&self, events: &mut Vec<AuthEvent>) {
        tracing::trace!(target: "collector::auth", "polling journald for auth events");
        // Future implementation: leverage `systemd-journal-gateway` or `sd-journal` bindings.
        let _ = events; // suppress unused warning for the placeholder implementation.
    }

    fn poll_auth_log(&self, events: &mut Vec<AuthEvent>) {
        tracing::trace!(target: "collector::auth", path = %self.config.auth_log_path.display(), "scanning auth.log fallback");
        let _ = events;
    }

    fn poll_wireguard(&self, events: &mut Vec<AuthEvent>) {
        if let Some(iface) = &self.config.wg_interface {
            tracing::trace!(target: "collector::auth", interface = iface, "checking WireGuard peers");
        }
        let _ = events;
    }
}
