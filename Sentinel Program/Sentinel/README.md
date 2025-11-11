# Sentinel Control (Android 14)

Sentinel Control is a security-first, offline-capable Android 14 (API 34) application scaffold. Import the project into Android Studio Hedgehog or newer to begin development and device deployment.

## Features

- **Device-Bound Keypair** via Android Keystore (EC `secp256r1`) with biometric gating prior to signatures.
- **Biometric Approval Flow** using `BiometricPrompt` to guard challenge signing.
- **Challenge/Approve API** integration with short-lived tokens, Retrofit/OkHttp client, and JSON encoding.
- **Sequential MFA Policy Engine** that enforces fingerprint → YubiKey → smart card → PIN ordering (hardware optional on day 0).
- **Sentinel Control UI** built with Jetpack Compose and Material 3 for single-screen operations.
- **Approval Token Store** backed by DataStore with 30-second TTL enforcement hooks.
- **Device Registration/Revocation** actions calling server endpoints with audit logging.
- **Threat Hygiene Checks** for root, SELinux, ADB, Developer Options, plus malware and heuristic scans.
- **Network Diagnostics & Whitelist** verifying connectivity, latency, and allowed LAN ranges.
- **Secure Audit Logging** with append-only digests and WorkManager-based upstream sync.
- **YubiKey & Smart Card Stubs** for future USB/NFC factor integrations.
- **Network Egress Controls** for VPN enforcement and emergency blocking.
- **Behavioral Telemetry** for local anomaly modeling and digest pushes.
- **Emergency Quarantine** action to deny future approvals and notify the server.
- **On-device Heuristics** scanning recent installs, CPU spikes, and outbound traffic.

## Project Structure

```
Sentinel/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/sentinel/control/
│       │   ├── MainActivity.kt
│       │   ├── SentinelApp.kt
│       │   ├── data/...
│       │   ├── logging/...
│       │   ├── mfa/...
│       │   ├── network/...
│       │   ├── security/...
│       │   ├── telemetry/...
│       │   ├── ui/...
│       │   └── util/...
│       └── res/
│           ├── values/
│           └── xml/
├── build.gradle.kts
├── gradle.properties
└── settings.gradle.kts
```

## Getting Started

1. Import the project into Android Studio (File → Open → select the `Sentinel` directory).
2. Sync Gradle to download dependencies.
3. Configure your Pi server base URL via `SharedPreferences` (`sentinel_network`).
4. Build and deploy to an Android 14 physical device with biometric hardware and USB/NFC support.

## Next Steps

- Wire the YubiKey and smart card handlers to concrete APIs (FIDO2, PIV APDUs).
- Replace placeholder network and malware heuristics with production-ready implementations.
- Implement the `/audit` server endpoint and tighten WorkManager upload cadence.
- Integrate WireGuard profile provisioning for automated VPN enforcement.
