//! Observation playbook.
//!
//! Captures evidence (configuration snapshots, process trees) without making
//! destructive changes.  Logging is intentionally chatty to guarantee operators
//! can trace every read operation.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ObservationRecord {
    pub artifact: String,
    pub destination: PathBuf,
    pub timestamp: SystemTime,
}

#[derive(Debug, Clone)]
pub struct ObserveConfig {
    pub evidence_dir: PathBuf,
    pub redact_patterns: Vec<String>,
}

impl Default for ObserveConfig {
    fn default() -> Self {
        Self {
            evidence_dir: PathBuf::from("/var/lib/sentinel-lite/evidence"),
            redact_patterns: vec![],
        }
    }
}

pub struct ObserveResponder {
    config: ObserveConfig,
}

impl ObserveResponder {
    pub fn new(config: ObserveConfig) -> Self {
        tracing::info!(
            target: "responder::observe",
            dir = %config.evidence_dir.display(),
            "initializing observe responder"
        );
        Self { config }
    }

    pub fn snapshot_config<P: AsRef<Path>>(&self, path: P) -> Option<ObservationRecord> {
        let src = path.as_ref();
        tracing::debug!(target: "responder::observe", path = %src.display(), "snapshotting config file");
        let dest = self.config.evidence_dir.join(src.strip_prefix("/").unwrap_or(src));
        if let Err(err) = fs::create_dir_all(dest.parent().unwrap_or(&self.config.evidence_dir)) {
            tracing::error!(target: "responder::observe", %err, "failed to prepare evidence directory");
            return None;
        }
        match fs::copy(src, &dest) {
            Ok(_) => Some(ObservationRecord {
                artifact: src.display().to_string(),
                destination: dest,
                timestamp: SystemTime::now(),
            }),
            Err(err) => {
                tracing::error!(target: "responder::observe", %err, "failed to copy config");
                None
            }
        }
    }
}
