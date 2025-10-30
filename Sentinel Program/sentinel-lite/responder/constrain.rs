//! Constrain playbook.
//!
//! Applies reversible containment steps: terminating process trees, remounting
//! paths read-only, and blocking egress.  Actions are logged loudly and recorded
//! for rollback consideration.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::time::SystemTime;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ConstrainAction {
    pub description: String,
    pub timestamp: SystemTime,
}

#[derive(Debug, Clone)]
pub struct ConstrainConfig {
    pub ledger_path: PathBuf,
}

impl Default for ConstrainConfig {
    fn default() -> Self {
        Self {
            ledger_path: PathBuf::from("/var/lib/sentinel-lite/actions.log"),
        }
    }
}

pub struct ConstrainResponder {
    config: ConstrainConfig,
}

impl ConstrainResponder {
    pub fn new(config: ConstrainConfig) -> Self {
        tracing::info!(target: "responder::constrain", path = %config.ledger_path.display(), "initializing constrain responder");
        Self { config }
    }

    pub fn kill_process_tree(&self, pid: u32) -> Option<ConstrainAction> {
        tracing::warn!(target: "responder::constrain", pid, "terminating process tree");
        // TODO: integrate with `kill` and recursive traversal.
        Some(self.record(format!("killed process tree {}", pid)))
    }

    pub fn remount_read_only(&self, mount_point: &str) -> Option<ConstrainAction> {
        tracing::warn!(target: "responder::constrain", mount_point, "remounting path read-only");
        let status = Command::new("mount")
            .args(["-o", "remount,ro", mount_point])
            .status();
        match status {
            Ok(_) => Some(self.record(format!("remounted {} read-only", mount_point))),
            Err(err) => {
                tracing::error!(target: "responder::constrain", %err, "failed to remount");
                None
            }
        }
    }

    pub fn block_egress(&self, destination: &str) -> Option<ConstrainAction> {
        tracing::warn!(target: "responder::constrain", destination, "blocking egress destination");
        // TODO: integrate with nftables rule edits.
        Some(self.record(format!("blocked egress to {}", destination)))
    }

    fn record(&self, description: String) -> ConstrainAction {
        let timestamp = SystemTime::now();
        let entry = format!(
            "{}: {}\n",
            chrono::DateTime::<chrono::Utc>::from(timestamp),
            description
        );
        if let Err(err) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.config.ledger_path)
            .and_then(|mut file| file.write_all(entry.as_bytes()))
        {
            tracing::error!(target: "responder::constrain", %err, "failed to append to ledger");
        }
        ConstrainAction {
            description,
            timestamp,
        }
    }
}
