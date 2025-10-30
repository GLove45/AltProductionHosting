//! Lightweight machine learning helpers for Sentinel Lite.
//!
//! The module provides optional models for flow and login analytics.  Each
//! scorer is gated by rules, with explicit versioning and verbose logging to
//! support transparent deployment.

use std::time::SystemTime;

use serde::Serialize;

use crate::collectors::auth::AuthEvent;
use crate::collectors::net::NetFlowEvent;

#[derive(Debug, Clone, Serialize)]
pub struct ModelScore {
    pub model: String,
    pub version: String,
    pub score: f32,
    pub threshold: f32,
    pub reason: String,
    pub timestamp: SystemTime,
}

pub struct FlowModel {
    pub version: String,
    pub threshold: f32,
}

impl FlowModel {
    pub fn score(&self, flow: &NetFlowEvent) -> Option<ModelScore> {
        tracing::trace!(target: "detector::model", model = %self.version, "scoring net flow");
        let baseline = (flow.bytes as f32) / 1024.0;
        if baseline > self.threshold {
            return Some(ModelScore {
                model: "net_flow_density".into(),
                version: self.version.clone(),
                score: baseline,
                threshold: self.threshold,
                reason: format!("flow volume {}KiB exceeded threshold", baseline),
                timestamp: flow.last_seen,
            });
        }
        None
    }
}

pub struct LoginTimeModel {
    pub version: String,
    pub threshold: f32,
}

impl LoginTimeModel {
    pub fn score(&self, auth: &AuthEvent) -> Option<ModelScore> {
        tracing::trace!(target: "detector::model", model = %self.version, user = %auth.user, "scoring login time histogram");
        let heuristic = if auth.off_hours { 1.0 } else { 0.0 };
        if heuristic > self.threshold {
            return Some(ModelScore {
                model: "login_time_histogram".into(),
                version: self.version.clone(),
                score: heuristic,
                threshold: self.threshold,
                reason: "login outside observed schedule".into(),
                timestamp: auth.timestamp,
            });
        }
        None
    }
}
