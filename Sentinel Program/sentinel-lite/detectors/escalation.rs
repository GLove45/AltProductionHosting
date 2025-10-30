//! Dual-signal escalation policy engine.
//!
//! The escalation module evaluates findings against capability graphs and
//! corroborating evidence before issuing response actions.  Verbose tracing
//! documents each decision branch for auditability.

use std::collections::{HashMap, HashSet};
use std::time::SystemTime;

use serde::Serialize;

use crate::detectors::ruleset::Finding;

#[derive(Debug, Clone, Serialize)]
pub struct Action {
    pub level: String,
    pub reason: String,
    pub findings: Vec<String>,
    pub timestamp: SystemTime,
}

#[derive(Debug, Default)]
pub struct EscalationState {
    cooldowns: HashMap<String, SystemTime>,
}

pub struct EscalationPolicy {
    allowed_capabilities: HashSet<String>,
    cooldown: std::time::Duration,
    state: EscalationState,
}

impl EscalationPolicy {
    pub fn new(allowed_capabilities: HashSet<String>, cooldown: std::time::Duration) -> Self {
        tracing::info!(
            target: "detector::escalation",
            ?allowed_capabilities,
            ?cooldown,
            "initializing escalation policy"
        );
        Self {
            allowed_capabilities,
            cooldown,
            state: EscalationState::default(),
        }
    }

    pub fn evaluate(&mut self, findings: &[Finding]) -> Option<Action> {
        tracing::trace!(target: "detector::escalation", count = findings.len(), "evaluating findings");
        if findings.is_empty() {
            return None;
        }

        let mut ids = Vec::new();
        let mut severity_score = 0;
        for finding in findings {
            if self.allowed_capabilities.contains(&finding.kind) {
                tracing::debug!(target: "detector::escalation", kind = %finding.kind, "capability allows finding; skipping");
                continue;
            }
            ids.push(finding.kind.clone());
            severity_score += match finding.severity.as_str() {
                "high" => 3,
                "medium" => 2,
                _ => 1,
            };
        }

        if ids.len() < 2 {
            tracing::debug!(target: "detector::escalation", "insufficient corroboration for escalation");
            return None;
        }

        if !self.can_escalate(&ids) {
            tracing::debug!(target: "detector::escalation", ?ids, "cooldown active");
            return None;
        }

        let level = if severity_score >= 5 {
            "isolate"
        } else if severity_score >= 3 {
            "constrain"
        } else {
            "observe"
        };

        let action = Action {
            level: level.into(),
            reason: format!("{} corroborated findings", ids.len()),
            findings: ids.clone(),
            timestamp: SystemTime::now(),
        };

        self.record_action(&ids);
        tracing::info!(
            target: "detector::escalation",
            level = %action.level,
            reason = %action.reason,
            "escalation action generated"
        );
        Some(action)
    }

    fn can_escalate(&self, ids: &[String]) -> bool {
        ids.iter().all(|id| {
            self.state
                .cooldowns
                .get(id)
                .map(|until| *until <= SystemTime::now())
                .unwrap_or(true)
        })
    }

    fn record_action(&mut self, ids: &[String]) {
        let expiry = SystemTime::now() + self.cooldown;
        for id in ids {
            self.state.cooldowns.insert(id.clone(), expiry);
        }
    }
}
