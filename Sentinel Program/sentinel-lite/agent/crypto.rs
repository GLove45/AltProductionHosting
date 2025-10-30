use std::convert::TryInto;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as b64, Engine as _};
use chrono::{DateTime, Datelike, Utc};
use ed25519_dalek::{SigningKey, VerifyingKey, Signature};
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256, Sha512};
use thiserror::Error;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("device key missing at {0}")]
    MissingDeviceKey(PathBuf),
    #[error("device key corrupted: {0}")]
    InvalidDeviceKey(String),
    #[error("anti-rollback counter decreased (stored={stored}, observed={observed})")]
    AntiRollback { stored: u64, observed: u64 },
}

#[derive(Debug, Clone, Deserialize)]
pub struct CryptoConfig {
    pub secrets_dir: PathBuf,
    pub trust_store: PathBuf,
    pub state_dir: PathBuf,
}

#[derive(Debug, Serialize)]
pub struct TamperEvidentRecord<'a> {
    pub timestamp: DateTime<Utc>,
    pub event_type: &'a str,
    pub body: serde_json::Value,
    pub signature: String,
    pub chain_hash: String,
}

#[derive(Debug)]
pub struct CryptoMaterial {
    device_signing_key: SigningKey,
    verifier: VerifyingKey,
    ca_pinset: Vec<String>,
    secrets_dir: PathBuf,
    state_dir: PathBuf,
}

impl CryptoMaterial {
    pub fn load(config: &CryptoConfig) -> Result<Self> {
        fs::create_dir_all(&config.state_dir)
            .with_context(|| format!("failed to create state dir {:?}", config.state_dir))?;
        let device_key_path = config.secrets_dir.join("device.key");
        let signing_key = if device_key_path.exists() {
            Self::read_signing_key(&device_key_path)?
        } else {
            let key = SigningKey::generate(&mut OsRng);
            Self::write_signing_key(&device_key_path, &key)?;
            key
        };
        let ca_pinset = Self::load_ca_pinset(&config.trust_store)?;
        Ok(Self {
            verifier: signing_key.verifying_key(),
            device_signing_key: signing_key,
            ca_pinset,
            secrets_dir: config.secrets_dir.clone(),
            state_dir: config.state_dir.clone(),
        })
    }

    pub fn verifying_key(&self) -> &VerifyingKey {
        &self.verifier
    }

    pub fn ca_pinset(&self) -> &[String] {
        &self.ca_pinset
    }

    pub fn sign_payload(&self, payload: &[u8]) -> Signature {
        self.device_signing_key.sign(payload)
    }

    pub fn sign_record(&self, record: &serde_json::Value) -> Result<TamperEvidentRecord<'_>> {
        let timestamp = Utc::now();
        let mut hasher = Sha512::new();
        let canonical = serde_json::to_vec(record)?;
        hasher.update(&canonical);
        hasher.update(timestamp.to_rfc3339().as_bytes());
        let previous = self.fetch_previous_chain_hash().unwrap_or_else(|| vec![0; 64]);
        hasher.update(&previous);
        let digest = hasher.finalize();
        let signature = self.sign_payload(&digest);
        let encoded_signature = b64.encode(signature.to_bytes());
        let chain_hash = b64.encode(digest);
        let record = TamperEvidentRecord {
            timestamp,
            event_type: record
                .get("type")
                .and_then(|value| value.as_str())
                .unwrap_or("unknown"),
            body: record.clone(),
            signature: encoded_signature,
            chain_hash: chain_hash.clone(),
        };
        self.persist_chain_hash(chain_hash.as_bytes())?;
        Ok(record)
    }

    pub fn derive_day_key(&self) -> Result<String> {
        let today = Utc::now();
        let hkdf = Hkdf::<Sha256>::new(
            None,
            self.device_signing_key.to_bytes().as_slice(),
        );
        let mut okm = [0u8; 32];
        let salt = format!("{}-{}-{}", today.year(), today.month(), today.day());
        hkdf.expand(salt.as_bytes(), &mut okm)
            .map_err(|_| anyhow::anyhow!("unable to derive day key"))?;
        Ok(hex::encode(okm))
    }

    pub fn hmac_digest(&self, payload: &[u8]) -> Result<String> {
        let key = hex::decode(self.derive_day_key()?)?;
        let mut mac = HmacSha256::new_from_slice(&key)
            .map_err(|err| anyhow::anyhow!("invalid day-key length: {err}"))?;
        mac.update(payload);
        let digest = mac.finalize().into_bytes();
        Ok(hex::encode(digest))
    }

    fn load_ca_pinset(trust_store: &Path) -> Result<Vec<String>> {
        let mut file = File::open(trust_store)
            .with_context(|| format!("unable to open trust store {trust_store:?}"))?;
        let mut buf = String::new();
        file.read_to_string(&mut buf)?;
        let pins = buf
            .lines()
            .filter(|line| line.starts_with("pin-sha256\""))
            .map(|line| line.trim().to_string())
            .collect();
        Ok(pins)
    }

    fn read_signing_key(path: &Path) -> Result<SigningKey> {
        let mut file = File::open(path)
            .with_context(|| format!("unable to open device key {path:?}"))?;
        let mut buffer = vec![];
        file.read_to_end(&mut buffer)?;
        SigningKey::from_bytes(&buffer.try_into().map_err(|_| {
            CryptoError::InvalidDeviceKey("invalid key length".to_string())
        })?)
        .map_err(|_| CryptoError::InvalidDeviceKey("unable to decode ed25519 key".to_string()).into())
    }

    fn write_signing_key(path: &Path, key: &SigningKey) -> Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(path)?;
        file.write_all(key.as_bytes())?;
        let mut perms = file.metadata()?.permissions();
        perms.set_mode(0o600);
        fs::set_permissions(path, perms)?;
        Ok(())
    }

    fn persist_chain_hash(&self, hash: &[u8]) -> Result<()> {
        let path = self.state_dir.join("chain.hash");
        let mut file = OpenOptions::new().create(true).write(true).truncate(true).open(&path)?;
        file.write_all(hash)?;
        let mut perms = file.metadata()?.permissions();
        perms.set_mode(0o600);
        fs::set_permissions(path, perms)?;
        Ok(())
    }

    fn fetch_previous_chain_hash(&self) -> Option<Vec<u8>> {
        let path = self.state_dir.join("chain.hash");
        fs::read(path).ok()
    }

    pub fn record_transparency_digest(&self, payload: &[u8]) -> Result<()> {
        let digest = self.hmac_digest(payload)?;
        let path = self.state_dir.join("transparency.log");
        let mut file = OpenOptions::new().create(true).append(true).open(&path)?;
        let mut perms = file.metadata()?.permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&path, perms)?;
        writeln!(file, "{} {}", Utc::now().to_rfc3339(), digest)?;
        Ok(())
    }

    pub fn check_rollback_counter(&self, observed: u64) -> Result<()> {
        let path = self.state_dir.join("rollback.counter");
        let stored = if path.exists() {
            let content = fs::read_to_string(&path)?;
            content.trim().parse::<u64>().unwrap_or_default()
        } else {
            0
        };
        if observed < stored {
            return Err(CryptoError::AntiRollback { stored, observed }.into());
        }
        let mut file = OpenOptions::new().create(true).write(true).truncate(true).open(path)?;
        writeln!(file, "{observed}")?;
        Ok(())
    }

    pub fn monotonically_increasing_counter(&self) -> Result<u64> {
        let path = self.state_dir.join("event.counter");
        let mut counter = if path.exists() {
            fs::read_to_string(&path)?.trim().parse::<u64>().unwrap_or(0)
        } else {
            0
        };
        counter += 1;
        let mut file = OpenOptions::new().create(true).write(true).truncate(true).open(path)?;
        writeln!(file, "{counter}")?;
        Ok(counter)
    }

    pub fn generate_ephemeral_secret(&self) -> Result<String> {
        let mut secret = [0u8; 32];
        OsRng.fill_bytes(&mut secret);
        Ok(b64.encode(secret))
    }

    pub fn checksum<P: AsRef<Path>>(&self, path: P) -> Result<String> {
        let mut file = File::open(path.as_ref())?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        loop {
            let read = file.read(&mut buffer)?;
            if read == 0 {
                break;
            }
            hasher.update(&buffer[..read]);
        }
        Ok(hex::encode(hasher.finalize()))
    }

    pub fn monotonic_timestamp(&self) -> Result<u128> {
        let duration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .context("system clock before unix epoch")?;
        Ok(duration.as_millis())
    }
}
