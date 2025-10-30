//! File system integrity and sensitive path monitoring collector.
//!
//! Utilizes fanotify/inotify for event-driven updates while maintaining
//! lightweight Merkle baselines to avoid self-reinforcing loops on Sentinel's
//! own evidence trail.  The module favors verbose tracing to make tuning on
//! production hosts straightforward.

use std::collections::HashMap;
use std::path::PathBuf;
use std::time::SystemTime;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct FileEvent {
    pub path: PathBuf,
    pub operation: String,
    pub uid: u32,
    pub gid: u32,
    pub mode_before: Option<u32>,
    pub mode_after: Option<u32>,
    pub sha256_before: Option<String>,
    pub sha256_after: Option<String>,
    pub timestamp: SystemTime,
}

#[derive(Debug, Clone)]
pub struct BaselineState {
    pub merkle_root: String,
    pub last_updated: SystemTime,
}

#[derive(Debug, Clone)]
pub struct FsCollectorConfig {
    pub watched_paths: Vec<PathBuf>,
    pub state_directory: PathBuf,
}

impl Default for FsCollectorConfig {
    fn default() -> Self {
        Self {
            watched_paths: vec![PathBuf::from("/etc"), PathBuf::from("/var/www")],
            state_directory: PathBuf::from("/var/lib/sentinel-lite/fs"),
        }
    }
}

pub struct FsCollector {
    config: FsCollectorConfig,
    baselines: HashMap<PathBuf, BaselineState>,
}

impl FsCollector {
    pub fn new(config: FsCollectorConfig) -> Self {
        tracing::info!(
            target: "collector::fs",
            paths = ?config.watched_paths,
            "initializing filesystem collector"
        );
        Self {
            config,
            baselines: HashMap::new(),
        }
    }

    pub fn load_baselines(&mut self) {
        tracing::trace!(target: "collector::fs", "loading filesystem baselines");
        // TODO: hydrate baseline map from persisted Merkle state.
    }

    pub fn snapshot(&self) {
        tracing::trace!(target: "collector::fs", "snapshotting current filesystem state");
        // TODO: compute Merkle roots and persist them with guardrails.
    }

    pub fn handle_event(&mut self, event: FileEvent) {
        tracing::debug!(
            target: "collector::fs",
            path = %event.path.display(),
            operation = %event.operation,
            "received filesystem event"
        );
        let _ = event;
    }
}
