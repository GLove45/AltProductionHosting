//! Platform health telemetry collector.
//!
//! Aggregates SMART/NVMe statistics, thermal data, and clock drift to inform the
//! green governor about hardware state.  The module embraces high verbosity to
//! make privilege troubleshooting and polling cadence adjustments transparent.

use std::time::{Duration, SystemTime};

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct HealthSample {
    pub component: String,
    pub metric: String,
    pub value: f64,
    pub unit: String,
    pub timestamp: SystemTime,
}

#[derive(Debug, Clone)]
pub struct HealthCollectorConfig {
    pub nvme_device: Option<String>,
    pub thermal_root: String,
    pub poll_interval: Duration,
}

impl Default for HealthCollectorConfig {
    fn default() -> Self {
        Self {
            nvme_device: Some("/dev/nvme0".into()),
            thermal_root: "/sys/class/thermal".into(),
            poll_interval: Duration::from_secs(120),
        }
    }
}

pub struct HealthCollector {
    config: HealthCollectorConfig,
}

impl HealthCollector {
    pub fn new(config: HealthCollectorConfig) -> Self {
        tracing::info!(
            target: "collector::health",
            ?config,
            "initializing platform health collector"
        );
        Self { config }
    }

    pub fn poll(&self) -> Vec<HealthSample> {
        tracing::trace!(target: "collector::health", "polling health sensors");
        let mut samples = Vec::new();
        self.collect_nvme(&mut samples);
        self.collect_thermal(&mut samples);
        self.collect_clock_drift(&mut samples);
        tracing::debug!(
            target: "collector::health",
            count = samples.len(),
            "health poll complete"
        );
        samples
    }

    fn collect_nvme(&self, samples: &mut Vec<HealthSample>) {
        if let Some(device) = &self.config.nvme_device {
            tracing::trace!(target: "collector::health", device, "collecting NVMe SMART stats");
        }
        let _ = samples;
    }

    fn collect_thermal(&self, samples: &mut Vec<HealthSample>) {
        tracing::trace!(target: "collector::health", root = %self.config.thermal_root, "collecting thermal zone data");
        let _ = samples;
    }

    fn collect_clock_drift(&self, samples: &mut Vec<HealthSample>) {
        tracing::trace!(target: "collector::health", "collecting chrony drift metrics");
        let _ = samples;
    }
}
