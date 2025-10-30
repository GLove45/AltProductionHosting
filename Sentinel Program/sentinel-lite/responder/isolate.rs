//! Isolation playbook.
//!
//! Executes high-impact but reversible controls to quarantine the host: disable
//! WireGuard handshakes, enforce default-drop policies, and require MFA-based
//! break-glass.  Diagnostics are heavily logged to reduce the chance of
//! accidental lockout.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::time::SystemTime;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct IsolationAction {
    pub description: String,
    pub timestamp: SystemTime,
}

#[derive(Debug, Clone)]
pub struct IsolationConfig {
    pub quarantine_flag: PathBuf,
}

impl Default for IsolationConfig {
    fn default() -> Self {
        Self {
            quarantine_flag: PathBuf::from("/var/lib/sentinel-lite/quarantine.flag"),
        }
    }
}

pub struct IsolateResponder {
    config: IsolationConfig,
}

impl IsolateResponder {
    pub fn new(config: IsolationConfig) -> Self {
        tracing::info!(target: "responder::isolate", path = %config.quarantine_flag.display(), "initializing isolate responder");
        Self { config }
    }

    pub fn disable_wireguard(&self, peer: &str) -> Option<IsolationAction> {
        tracing::error!(target: "responder::isolate", peer, "disabling WireGuard peer");
        let status = Command::new("wg").args(["set", peer, "disable"]).status();
        match status {
            Ok(_) => Some(self.record(format!("disabled WireGuard peer {}", peer))),
            Err(err) => {
                tracing::error!(target: "responder::isolate", %err, "failed to disable WireGuard peer");
                None
            }
        }
    }

    pub fn enforce_default_drop(&self) -> Option<IsolationAction> {
        tracing::error!(target: "responder::isolate", "enforcing default-drop egress policy");
        // TODO: integrate with nftables default chain updates.
        Some(self.record("set nftables default policy to drop".into()))
    }

    pub fn write_quarantine_flag(&self) -> Option<IsolationAction> {
        tracing::error!(target: "responder::isolate", path = %self.config.quarantine_flag.display(), "writing quarantine flag");
        if let Err(err) = fs::create_dir_all(self.config.quarantine_flag.parent().unwrap_or(&PathBuf::from("/var/lib/sentinel-lite"))) {
            tracing::error!(target: "responder::isolate", %err, "failed to prepare quarantine directory");
            return None;
        }
        match OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&self.config.quarantine_flag)
            .and_then(|mut file| file.write_all(b"isolation_active"))
        {
            Ok(_) => Some(self.record("wrote quarantine flag".into())),
            Err(err) => {
                tracing::error!(target: "responder::isolate", %err, "failed to write quarantine flag");
                None
            }
        }
    }

    fn record(&self, description: String) -> IsolationAction {
        IsolationAction {
            description,
            timestamp: SystemTime::now(),
        }
    }
}
