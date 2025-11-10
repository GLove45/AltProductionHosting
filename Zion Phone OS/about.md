Zion Phone OS — production blueprint

Zion is a full android app functioning, security-centric phone OS with a hard, verifiable boot chain and a clean app surface. The base image is a trimmed AOSP for Sony Xperia 10 IV, re-signed with Alt keys, SELinux enforcing, dm-verity on, and A/B OTA. No telemetry, no third-party services. Networking is default-deny: only our WireGuard endpoints, time sync, and revocation lists. You get a full shell UI (dialer, messages, camera, files), an App Runtime for your modules, and a Policy Bus that everything talks through.

The layered model (modular by design)

At the foundation sits Zion Core: verified boot, kernel hardening, SELinux profiles, device drivers, power, NFC, fingerprint, camera. Above that is System Services: identity, keystore, networking, update, storage, and the Policy Bus—a signed, publish/subscribe control plane that moves decisions and events between modules without tight coupling. On top rides the App Runtime and the Zion SDK. All first-party capabilities—Sentinel Lite, Advanced MFA, Wellbeing, Device Health—ship as apps that consume the SDK and talk over the Policy Bus. When any module proves stable and strategic (Sentinel), we can “drop it down” into System Services with zero API churn.

Identity, keys, and trust

Every device is provisioned with a hardware-backed device keypair and a certificate chained to your Xion Device CA. Apps are signed with Xion App CA; OS images and OTAs with Zion Update CA. Boot measurements and OS hashes are signed at boot and verified by Sentinel before the device is granted policy. Revocation is instant: flip a cert and the device falls into quarantine with a locked profile and forensic capture.

Networking and comms

Xion only speaks WireGuard to your gateways. All inter-module messaging stays local via the Policy Bus. Sentinel connections are policy-pull, evidence-push: the device requests policy bundles and sends attested telemetry, never accepting arbitrary inbound control. Offline is first-class: the device caches policy, runs MFA and admin flows locally, and synchronizes evidence once a link returns. No open web; no sideband channels.

The application pattern

Apps are sandboxed, permission-scoped, and policy-aware. They subscribe to topics on the Policy Bus (e.g., auth/gate, risk/anomaly, telemetry/energy, updates/status) and publish events or requests (auth/attempt, risk/score, mfa/complete). Sentinel Lite is just another app with elevated capabilities granted by policy. This lets you ship Sentinel, Advanced MFA, Wellbeing, Admin Console, and later third-party utilities without changing the OS.

Sentinel Lite as an app (day one)

The app exposes the ordered, time-boxed launch sequence you already defined: Card → Fingerprint → Password → FIDO/NFC token → QR nonce. Each step emits a signed event with timestamps, device identity, sensor provenance, and a pass/fail code. Sentinel Lite also collects boot measurements, network posture, liveness checks, and anomaly summaries, batching everything into signed evidence bundles for HQ. If HQ policy flags risk, Sentinel Lite can quarantine the device, force full re-auth, or trigger a secure wipe.

Cross-platform Lite agents

To bootstrap your wider ecosystem, we maintain a Sentinel Lite Agent for Windows, macOS, and generic Linux with the same Policy Bus contracts. Those agents run as tray/background apps, bind to OS key stores, pair with your servers via WireGuard, and surface gated admin flows with whatever sensors are available. Same events, same policy semantics—so your back-end doesn’t care which client sent them.

Storage model and data discipline

Xion maintains an append-only Forensic Log on device. Entries are block-hashed, time-stamped, and periodically sealed with the device key. We store only what’s needed for decisions: gate outcomes, timing, environment, boot hashes, and policy versions. No content, no personal data beyond what’s essential for security. Evidence uploads are encrypted, deduplicated, and retained per a configurable policy (your defaults: 90 days on device, 365 days server-side).

Updates and rollout

We ship A/B seamless OTAs signed by Xion Update CA. Each release includes an SBOM and a transparency hash anchored in your ledger. Devices refuse unsigned bits, verify rollback indices, and report success into Sentinel. Apps update through the same channel; sideloading is disabled in production. A “Client Mode” profile hides developer tools and locks the surface to Auth + Sentinel + Dialer.

Day-one MVP (what you’ll hold in hand)

You’ll have a locked Xperia 10 IV running Xion Core with SELinux enforcing, WireGuard-only egress, verified boot under your keys, and three tiles on the home screen: Authenticate, Sentinel, Settings. The Authenticate flow enforces your five-gate sequence with your time windows and full reset on any miss. Sentinel Lite shows device health, link status, and incident feed. Updates arrive over the signed channel. Everything is logged and attestable.

Module catalog (initial wave)

Zion Core (OS), Policy Bus (event fabric), Identity & Keystore (certs, attestation), Update Service (A/B OTA), Network Service (WireGuard, allowlists), Forensic Logger (append-only store), Sentinel Lite (MFA + telemetry), Advanced MFA (policy-driven gate composer and device enrollment), Wellbeing (optional ergonomics telemetry, off by default), Admin Console (local actions, lockdowns), Device Health (battery/thermal/hardware checks), Comms Connector (outbound alerts via your chosen channel).

Governance, openness, and scaling path

We publish the Zion SDK, Policy Bus contracts, and sample app code under a permissive license once stable. The base OS sources and SELinux policies ship in a public repo with a reproducible build pipeline. Third-party developers can target the SDK and submit modules that run inside your policy sandbox, without store-style tracking. As Sentinel matures, we can promote it from app to System Service, keeping the same API surface so no apps break.
