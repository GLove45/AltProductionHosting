//! Process lineage and execution collector.
//!
//! Designed to leverage either auditd EXECVE events or portable eBPF probes on
//! Ubuntu 24.04 kernels.  The module exposes a uniform event stream describing
//! process ancestry, binary metadata, and socket context.  Extensive tracing
//! output supports rapid diagnostics in constrained edge deployments.

use std::collections::VecDeque;
use std::time::{Duration, SystemTime};

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ProcessEvent {
    pub pid: u32,
    pub ppid: u32,
    pub tree_hash: String,
    pub binary: String,
    pub parent_binary: String,
    pub start_time: SystemTime,
    pub sockets: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum ProcSource {
    Auditd,
    Ebpf,
}

#[derive(Debug, Clone)]
pub struct ProcCollectorConfig {
    pub source: ProcSource,
    pub poll_interval: Duration,
}

impl Default for ProcCollectorConfig {
    fn default() -> Self {
        Self {
            source: ProcSource::Auditd,
            poll_interval: Duration::from_secs(10),
        }
    }
}

pub struct ProcCollector {
    config: ProcCollectorConfig,
    backlog: VecDeque<ProcessEvent>,
}

impl ProcCollector {
    pub fn new(config: ProcCollectorConfig) -> Self {
        tracing::info!(
            target: "collector::proc",
            ?config,
            "initializing process collector"
        );
        Self {
            config,
            backlog: VecDeque::new(),
        }
    }

    pub fn poll(&mut self) -> Vec<ProcessEvent> {
        tracing::trace!(target: "collector::proc", "polling process telemetry");

        match self.config.source {
            ProcSource::Auditd => self.read_auditd(),
            ProcSource::Ebpf => self.read_ebpf(),
        }

        let events: Vec<_> = self.backlog.drain(..).collect();
        tracing::debug!(
            target: "collector::proc",
            count = events.len(),
            "process poll complete"
        );
        events
    }

    fn read_auditd(&mut self) {
        tracing::trace!(target: "collector::proc", "reading EXECVE events via auditd");
        // TODO: integrate with auditd subscription using `audit` crate bindings.
    }

    fn read_ebpf(&mut self) {
        tracing::trace!(target: "collector::proc", "reading execve tracepoints via eBPF");
        // TODO: implement portable eBPF program loader for kernels >= 6.x.
    }

    pub fn enrich_with_procfs(&self, event: &mut ProcessEvent) {
        tracing::trace!(target: "collector::proc", pid = event.pid, "enriching event using /proc");
        let _ = event;
    }
}
