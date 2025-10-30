mod crypto;
mod router;

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant};

use anyhow::{Context, Result};
use chrono::{DateTime, Local, Utc};
use crypto::{CryptoConfig, CryptoMaterial};
use log::{debug, error, info, warn};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use router::{EventRouter, EventTopic, TopicConfig};
use sd_notify::NotifyState;
use serde::Deserialize;
use serde_yaml::Value;
use sha2::Digest;
use signal_hook::consts::{SIGINT, SIGTERM, SIGHUP};
use signal_hook::iterator::Signals;

#[derive(Debug, Clone)]
struct CliOptions {
    policy_path: PathBuf,
    state_dir: PathBuf,
    secrets_dir: PathBuf,
    trust_store: PathBuf,
}

impl CliOptions {
    fn parse() -> Result<Self> {
        let mut args = std::env::args().skip(1);
        let mut policy_path = PathBuf::from("/opt/sentinel-lite/policy.yaml");
        let mut state_dir = PathBuf::from("/var/lib/sentinel-lite");
        let mut secrets_dir = PathBuf::from("/opt/sentinel-lite/secrets");
        let mut trust_store = PathBuf::from("/etc/truststore.pem");
        while let Some(arg) = args.next() {
            match arg.as_str() {
                "--policy" => {
                    if let Some(value) = args.next() {
                        policy_path = PathBuf::from(value);
                    }
                }
                "--state-dir" => {
                    if let Some(value) = args.next() {
                        state_dir = PathBuf::from(value);
                    }
                }
                "--secrets-dir" => {
                    if let Some(value) = args.next() {
                        secrets_dir = PathBuf::from(value);
                    }
                }
                "--trust-store" => {
                    if let Some(value) = args.next() {
                        trust_store = PathBuf::from(value);
                    }
                }
                "--help" | "-h" => {
                    println!("Sentinel Lite agent\n\nFLAGS:\n    --policy <path>       Policy YAML path\n    --state-dir <dir>    Writable state directory\n    --secrets-dir <dir>  Directory containing device.key\n    --trust-store <path> PEM trust anchors\n");
                    std::process::exit(0);
                }
                other => {
                    warn!("unknown flag ignored: {}", other);
                }
            }
        }
        Ok(Self {
            policy_path,
            state_dir,
            secrets_dir,
            trust_store,
        })
    }
}

#[derive(Debug, Clone)]
struct PolicyDocument {
    raw: Value,
    checksum: String,
    loaded_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct PolicyMetadata {
    timezone: Option<String>,
    policy_checksum: Option<String>,
    revision: Option<String>,
}

struct Agent {
    options: CliOptions,
    crypto: CryptoMaterial,
    router: EventRouter,
    policy: PolicyDocument,
    policy_metadata: PolicyMetadata,
}

impl Agent {
    fn bootstrap(options: CliOptions) -> Result<Self> {
        let crypto = CryptoMaterial::load(&CryptoConfig {
            secrets_dir: options.secrets_dir.clone(),
            trust_store: options.trust_store.clone(),
            state_dir: options.state_dir.clone(),
        })?;
        let policy = Self::load_policy(&options.policy_path)?;
        let policy_metadata: PolicyMetadata = serde_yaml::from_value(
            policy
                .raw
                .get("metadata")
                .cloned()
                .unwrap_or(Value::Null),
        )
        .unwrap_or(PolicyMetadata {
            timezone: None,
            policy_checksum: None,
            revision: None,
        });
        let router = Self::build_router();
        Ok(Self {
            options,
            crypto,
            router,
            policy,
            policy_metadata,
        })
    }

    fn build_router() -> EventRouter {
        let mut configs = HashMap::new();
        configs.insert(EventTopic::Network, TopicConfig { capacity: 2048, high_watermark: 0.9 });
        configs.insert(EventTopic::Integrity, TopicConfig { capacity: 1024, high_watermark: 0.85 });
        configs.insert(EventTopic::Process, TopicConfig { capacity: 1024, high_watermark: 0.85 });
        configs.insert(EventTopic::Evidence, TopicConfig { capacity: 256, high_watermark: 0.75 });
        configs.insert(EventTopic::Responder, TopicConfig { capacity: 512, high_watermark: 0.8 });
        EventRouter::new(configs)
    }

    fn run(&mut self) -> Result<()> {
        self.initialise_timezone();
        self.announce_ready()?;
        self.spawn_metrics_logger();
        let mut signals = Signals::new([SIGINT, SIGTERM, SIGHUP])?;
        let policy_path = self.options.policy_path.clone();
        let mut watcher: RecommendedWatcher = Watcher::new(
            move |res| {
                if let Err(err) = res {
                    error!("policy watcher error: {err:?}");
                } else {
                    info!("policy.yaml change detected; requesting hot reload via SIGHUP");
                    let rc = unsafe { libc::raise(SIGHUP) };
                    if rc != 0 {
                        error!("failed to raise SIGHUP during hot reload: rc={rc}");
                    }
                }
            },
            notify::Config::default(),
        )?;
        watcher.watch(&policy_path, RecursiveMode::NonRecursive)?;

        for signal in signals.forever() {
            match signal {
                SIGINT | SIGTERM => {
                    info!("received shutdown signal {signal}; draining event router");
                    self.router.broadcast_shutdown();
                    break;
                }
                SIGHUP => {
                    info!("SIGHUP received; attempting hot reload of policy");
                    if let Err(err) = self.reload_policy() {
                        error!("policy reload failed: {err:?}");
                    }
                }
                other => {
                    warn!("unexpected signal {other} received");
                }
            }
        }
        info!("agent shutdown complete");
        Ok(())
    }

    fn announce_ready(&self) -> Result<()> {
        if sd_notify::notify(true, &[NotifyState::Ready])? {
            info!("systemd notified of readiness");
        }
        if sd_notify::notify(true, &[NotifyState::Watchdog])? {
            debug!("systemd watchdog pinged");
        }
        Ok(())
    }

    fn spawn_metrics_logger(&self) {
        let router = self.router.clone();
        thread::spawn(move || loop {
            thread::sleep(Duration::from_secs(30));
            let metrics = router.metrics();
            debug!("router metrics: depths={:?} dropped={:?}", metrics.topic_depths, metrics.dropped);
        });
    }

    fn initialise_timezone(&self) {
        if let Some(tz) = &self.policy_metadata.timezone {
            std::env::set_var("TZ", tz);
            info!("policy timezone set to {tz}");
        } else {
            debug!("policy metadata missing timezone; using system default");
        }
    }

    fn reload_policy(&mut self) -> Result<()> {
        let new_policy = Self::load_policy(&self.options.policy_path)?;
        if new_policy.checksum == self.policy.checksum {
            info!("policy checksum unchanged; skipping reload");
            return Ok(());
        }
        let new_metadata: PolicyMetadata = serde_yaml::from_value(
            new_policy
                .raw
                .get("metadata")
                .cloned()
                .unwrap_or(Value::Null),
        )
        .unwrap_or(PolicyMetadata {
            timezone: None,
            policy_checksum: None,
            revision: None,
        });
        if let (Some(expected), Some(actual)) = (
            new_metadata.policy_checksum.as_ref(),
            new_policy.raw.get("metadata").and_then(|meta| meta.get("policy_checksum")).and_then(|val| val.as_str()),
        ) {
            if expected != actual {
                warn!("metadata checksum mismatch expected={} actual={}", expected, actual);
            }
        }
        info!(
            "policy reload succeeded new_checksum={} revision={:?}",
            new_policy.checksum,
            new_metadata.revision
        );
        self.policy = new_policy;
        self.policy_metadata = new_metadata;
        self.initialise_timezone();
        self.crypto.record_transparency_digest(self.policy.checksum.as_bytes())?;
        Ok(())
    }

    fn load_policy(path: &Path) -> Result<PolicyDocument> {
        let contents = fs::read_to_string(path)
            .with_context(|| format!("unable to read policy from {path:?}"))?;
        let raw: Value = serde_yaml::from_str(&contents)
            .with_context(|| format!("policy {path:?} contains invalid YAML"))?;
        Self::validate_policy(&raw)?;
        let checksum = {
            let mut hasher = sha2::Sha256::new();
            hasher.update(contents.as_bytes());
            format!("{:x}", hasher.finalize())
        };
        Ok(PolicyDocument {
            raw,
            checksum,
            loaded_at: Utc::now(),
        })
    }

    fn validate_policy(document: &Value) -> Result<()> {
        fn expect_map<'a>(value: &'a Value, context: &str) -> Result<&'a serde_yaml::Mapping> {
            value
                .as_mapping()
                .ok_or_else(|| anyhow::anyhow!("{context} must be a mapping"))
        }

        let root = expect_map(document, "policy root")?;
        let allowed_root = [
            "schema_version",
            "metadata",
            "capabilities",
            "consent",
            "thresholds",
            "maintenance",
            "validations",
        ];
        for key in root.keys() {
            let key_str = key.as_str().ok_or_else(|| anyhow::anyhow!("policy keys must be strings"))?;
            if !allowed_root.contains(&key_str) {
                return Err(anyhow::anyhow!("unknown top-level key: {key_str}"));
            }
        }

        if let Some(metadata) = root.get(&Value::from("metadata")) {
            let metadata_map = expect_map(metadata, "metadata")?;
            let allowed_metadata = [
                "name",
                "description",
                "owner",
                "timezone",
                "revision",
                "policy_checksum",
                "reload",
            ];
            for key in metadata_map.keys() {
                let key_str = key.as_str().ok_or_else(|| anyhow::anyhow!("metadata keys must be strings"))?;
                if !allowed_metadata.contains(&key_str) {
                    return Err(anyhow::anyhow!("unknown metadata key: {key_str}"));
                }
            }
        }

        if let Some(capabilities) = root.get(&Value::from("capabilities")) {
            let list = capabilities.as_sequence().ok_or_else(|| anyhow::anyhow!("capabilities must be a list"))?;
            for (idx, entry) in list.iter().enumerate() {
                let map = expect_map(entry, &format!("capability[{idx}]"))?;
                let allowed = ["token", "subject", "surfaces", "schedules"];
                for key in map.keys() {
                    let key_str = key.as_str().ok_or_else(|| anyhow::anyhow!("capability keys must be strings"))?;
                    if !allowed.contains(&key_str) {
                        return Err(anyhow::anyhow!("unknown capability key: {key_str}"));
                    }
                }
            }
        }

        if let Some(validations) = root.get(&Value::from("validations")) {
            let validations_map = expect_map(validations, "validations")?;
            let allowed = ["strict_keys", "checksum_algorithm", "require_signed_policy"];
            for key in validations_map.keys() {
                let key_str = key.as_str().ok_or_else(|| anyhow::anyhow!("validation keys must be strings"))?;
                if !allowed.contains(&key_str) {
                    return Err(anyhow::anyhow!("unknown validation key: {key_str}"));
                }
            }
        }

        Ok(())
    }
}

fn init_logging() {
    let mut builder = env_logger::Builder::from_default_env();
    builder
        .format(|buf, record| {
            use std::io::Write;
            let ts = Local::now().to_rfc3339();
            writeln!(
                buf,
                "{ts} [{:<5}] {}:{} {}",
                record.level(),
                record.file().unwrap_or("unknown"),
                record.line().unwrap_or(0),
                record.args()
            )
        })
        .filter_level(log::LevelFilter::Info)
        .init();
}

fn main() -> Result<()> {
    init_logging();
    let options = CliOptions::parse()?;
    info!("Sentinel Lite agent starting with policy {:?}", options.policy_path);
    let mut agent = Agent::bootstrap(options)?;
    agent.run()?;
    Ok(())
}
