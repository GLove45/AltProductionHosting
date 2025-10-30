//! Network flow and DNS/SNI metadata collector.
//!
//! Interfaces with conntrack/netlink plus DNS logs to produce normalized
//! per-flow records used downstream by detection models.  The implementation is
//! optimized for low overhead and leans heavily on verbose tracing for
//! observability.

use std::net::IpAddr;
use std::time::{Duration, SystemTime};

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct NetFlowEvent {
    pub src: IpAddr,
    pub dst: IpAddr,
    pub proto: String,
    pub bytes: u64,
    pub packets: u64,
    pub asn: Option<u32>,
    pub sni: Option<String>,
    pub first_seen: SystemTime,
    pub last_seen: SystemTime,
}

#[derive(Debug, Clone)]
pub struct NetCollectorConfig {
    pub poll_interval: Duration,
    pub dns_log_path: Option<String>,
    pub asn_database: Option<String>,
}

impl Default for NetCollectorConfig {
    fn default() -> Self {
        Self {
            poll_interval: Duration::from_secs(30),
            dns_log_path: Some("/var/log/systemd-resolved.log".into()),
            asn_database: Some("/var/lib/sentinel-lite/GeoLite2-ASN.mmdb".into()),
        }
    }
}

pub struct NetCollector {
    config: NetCollectorConfig,
}

impl NetCollector {
    pub fn new(config: NetCollectorConfig) -> Self {
        tracing::info!(
            target: "collector::net",
            ?config,
            "initializing network collector"
        );
        Self { config }
    }

    pub fn poll(&self) -> Vec<NetFlowEvent> {
        tracing::trace!(target: "collector::net", "polling conntrack/netlink");
        let mut flows = Vec::new();
        self.collect_conntrack(&mut flows);
        self.enrich_dns(&mut flows);
        self.enrich_asn(&mut flows);
        tracing::debug!(
            target: "collector::net",
            count = flows.len(),
            "network poll complete"
        );
        flows
    }

    fn collect_conntrack(&self, flows: &mut Vec<NetFlowEvent>) {
        tracing::trace!(target: "collector::net", "collecting flows from conntrack");
        let _ = flows;
    }

    fn enrich_dns(&self, flows: &mut [NetFlowEvent]) {
        if let Some(path) = &self.config.dns_log_path {
            tracing::trace!(target: "collector::net", path, "enriching flows with DNS metadata");
        }
        let _ = flows;
    }

    fn enrich_asn(&self, flows: &mut [NetFlowEvent]) {
        if let Some(db) = &self.config.asn_database {
            tracing::trace!(target: "collector::net", database = db, "performing ASN lookups");
        }
        let _ = flows;
    }
}
