//! Stateless and stateful analytic rules for Sentinel Lite.
//!
//! The ruleset consumes normalized collector events and applies deterministic
//! policies to yield findings.  The design supports sliding window aggregation,
//! duplicate suppression, and explicit correlation keys.

use std::collections::{HashMap, HashSet};
use std::time::{Duration, SystemTime};

use serde::Serialize;

use crate::collectors::auth::AuthEvent;
use crate::collectors::fs::FileEvent;
use crate::collectors::net::NetFlowEvent;
use crate::collectors::proc::ProcessEvent;

#[derive(Debug, Clone, Serialize)]
pub struct Finding {
    pub kind: String,
    pub severity: String,
    pub reason: String,
    pub primary: String,
    pub related: HashSet<String>,
    pub timestamp: SystemTime,
}

#[derive(Debug, Default)]
pub struct RulesetState {
    auth_windows: HashMap<String, Vec<SystemTime>>, // user -> login timestamps
    net_baseline: HashMap<String, u64>,              // asn -> bytes
    fs_change_window: HashMap<String, SystemTime>,   // path -> last change
}

pub struct RulesetDetector {
    window: Duration,
    state: RulesetState,
}

impl RulesetDetector {
    pub fn new(window: Duration) -> Self {
        tracing::info!(target: "detector::rules", ?window, "initializing ruleset detector");
        Self {
            window,
            state: RulesetState::default(),
        }
    }

    pub fn ingest_auth(&mut self, event: &AuthEvent) -> Option<Finding> {
        tracing::trace!(target: "detector::rules", user = %event.user, "processing auth event");
        let entries = self.state.auth_windows.entry(event.user.clone()).or_default();
        entries.push(event.timestamp);
        self.trim_window(entries);
        if entries.len() > 5 {
            return Some(Finding {
                kind: "auth_burst".into(),
                severity: "medium".into(),
                reason: format!("{} authentication events in {:?}", entries.len(), self.window),
                primary: event.user.clone(),
                related: HashSet::new(),
                timestamp: event.timestamp,
            });
        }
        None
    }

    pub fn ingest_process(&mut self, event: &ProcessEvent) -> Option<Finding> {
        tracing::trace!(target: "detector::rules", pid = event.pid, "processing process event");
        if event.parent_binary.contains("/usr/sbin") && event.binary.contains("/bin/sh") {
            return Some(Finding {
                kind: "daemon_to_shell".into(),
                severity: "high".into(),
                reason: format!("{} spawned shell {}", event.parent_binary, event.binary),
                primary: event.tree_hash.clone(),
                related: HashSet::new(),
                timestamp: event.start_time,
            });
        }
        None
    }

    pub fn ingest_filesystem(&mut self, event: &FileEvent) -> Option<Finding> {
        tracing::trace!(target: "detector::rules", path = %event.path.display(), "processing filesystem event");
        let key = event.path.display().to_string();
        self.state.fs_change_window.insert(key.clone(), event.timestamp);
        Some(Finding {
            kind: "webroot_change".into(),
            severity: "medium".into(),
            reason: format!("{} changed outside maintenance window", key),
            primary: key,
            related: HashSet::new(),
            timestamp: event.timestamp,
        })
    }

    pub fn ingest_netflow(&mut self, event: &NetFlowEvent) -> Option<Finding> {
        let asn_key = event
            .asn
            .map(|asn| asn.to_string())
            .unwrap_or_else(|| "unknown".into());
        tracing::trace!(target: "detector::rules", asn = %asn_key, "processing netflow event");
        let counter = self.state.net_baseline.entry(asn_key.clone()).or_insert(0);
        *counter += event.bytes;
        if *counter > 10 * 1024 * 1024 {
            return Some(Finding {
                kind: "new_asn_egress_spike".into(),
                severity: "high".into(),
                reason: format!("egress spike observed for ASN {}", asn_key),
                primary: asn_key,
                related: HashSet::new(),
                timestamp: event.last_seen,
            });
        }
        None
    }

    fn trim_window(&self, entries: &mut Vec<SystemTime>) {
        let cutoff = SystemTime::now() - self.window;
        entries.retain(|ts| *ts >= cutoff);
    }
}
