# Zion Phone OS Boot, Install & Setup Guide

This document describes the initial workflow for bringing up Zion Phone OS on a Sony Xperia 10 IV starting from a stock Android boot chain. The goal is to establish a verifiable, policy-enforced environment ready to run the Zion module stack.

## 1. Prerequisites
- **Hardware**: Sony Xperia 10 IV (pdx224) with an OEM-unlocked bootloader authorization token from Sony and at least 50% battery.
- **Host environment**: Linux workstation with `repo`, `git`, `python3`, `docker`, `fastboot`, `adb`, `xz`, and Android build dependencies installed. Install the latest Sony `fastboot`/USB drivers or add the provided udev rule on Linux to prevent flashing failures.
- **Keys**: Alt signing key hierarchy (Device CA, App CA, Update CA) generated and stored in a hardware security module or secure enclave accessible to the build pipeline.
- **Artifacts**: Zion release archive (`zion-xperia10iv-<build>.tar.xz`), AOSP source manifest pinned to the Xperia 10 IV device tree, Zion Core kernel patches, SELinux policy overlays, WireGuard configuration bundle, and initial Policy Bus contracts.

### 1.1 Prepare Downloaded Release Package
1. Fetch the signed release bundle from Alt's artifact registry:
   ```bash
   curl -O https://artifacts.alt/zion/xperia10iv/zion-xperia10iv-<build>.tar.xz
   curl -O https://artifacts.alt/zion/xperia10iv/zion-xperia10iv-<build>.tar.xz.sig
   ```
2. Verify the detached signature before extracting:
   ```bash
   gpg --verify zion-xperia10iv-<build>.tar.xz.sig zion-xperia10iv-<build>.tar.xz
   ```
3. Extract the archive and export helper paths for later flashing:
   ```bash
   tar -xJf zion-xperia10iv-<build>.tar.xz -C ~/zion-builds
   export ZION_RELEASE_DIR=~/zion-builds/zion-xperia10iv-<build>
   ```
4. Confirm that `boot.img`, `system.img`, `vendor.img`, `product.img`, `vbmeta.img`, and the policy contract bundle are present inside `${ZION_RELEASE_DIR}`. Missing files should be re-synced before proceeding.

## 2. High-Level Flow
1. Sync and prepare the trimmed AOSP tree.
2. Apply Zion Core patches (kernel, SELinux, dm-verity, verified boot chain adjustments).
3. Integrate WireGuard kernel module and userland tooling.
4. Bake default-deny network policy and allowlists into init scripts and SELinux contexts.
5. Build the base system image, vendor image, and boot image.
6. Sign images with Alt keys and generate vbmeta with enforced flags.
7. Flash images to both A/B slots and verify boot integrity.
8. Perform first boot provisioning to enroll device keys and pull baseline policy from Sentinel.

## 3. Detailed Steps
### 3.1 Sync Zion AOSP Manifest
```bash
repo init -u git@alt.git:zion/aosp-manifests.git -b zion-xperia10iv
repo sync --current-branch --no-clone-bundle --jobs=$(nproc)
```
- Manifest includes device tree, vendor blobs, and Zion overlays under `zion/` directories.
- If you are building directly from the validated release bundle instead of source, replace this step with `repo sync --manifest-name=${ZION_RELEASE_DIR}/manifests/default.xml` to ensure identical revisions.

### 3.2 Configure Build Environment
```bash
source build/envsetup.sh
lunch zion_xperia10iv-user
export ZION_POLICY_ENDPOINT="wg.zion.alt"
export ZION_DEFAULT_PROFILE="client-mode"
```
- `zion_xperia10iv-user` enforces SELinux, dm-verity, and A/B OTA flags.

### 3.3 Apply Core Patches
```bash
./zion/tools/apply_patches.sh
```
- Patches cover kernel hardening, init script adjustments, Policy Bus socket setup, Forensic Logger integration, and removal of telemetry packages.

### 3.4 Build Images
```bash
m -j$(nproc) bootimage systemimage vendorimage productimage otapackage
```
- Outputs land in `out/target/product/pdx224/`.

### 3.5 Sign & Verify
```bash
zion/tools/sign_images.sh out/target/product/pdx224 \
  --device-ca keys/device/ \
  --update-ca keys/update/ \
  --app-ca keys/app/

fastboot erase userdata
fastboot reboot bootloader

# Flash either freshly built images or those from ${ZION_RELEASE_DIR}
fastboot --slot all flash boot ${ZION_RELEASE_DIR:-out/target/product/pdx224}/boot.img
fastboot --slot all flash system ${ZION_RELEASE_DIR:-out/target/product/pdx224}/system.img
fastboot --slot all flash vendor ${ZION_RELEASE_DIR:-out/target/product/pdx224}/vendor.img
fastboot --slot all flash product ${ZION_RELEASE_DIR:-out/target/product/pdx224}/product.img
fastboot --slot all flash vbmeta ${ZION_RELEASE_DIR:-out/target/product/pdx224}/vbmeta.img

fastboot set_active a
fastboot reboot bootloader
fastboot set_active b
fastboot reboot bootloader
fastboot getvar all | grep "secure"
```
- Ensure `secure: yes`, `verified: yes`, `off-mode-charge: 1`, and both slots report the updated build fingerprint.
- If flashing fails with `FAILED (remote: Device already rooted)`, re-run Sony's `newflasher` with stock firmware, re-unlock the bootloader, and retry.

### 3.6 First Boot Provisioning
1. Allow device to boot into Zion setup wizard (Policy Bus aware).
2. Connect via USB and run:
   ```bash
   adb wait-for-device
   adb shell zion-provision --mode=secure-enroll \
     --wireguard-config /secure/configs/wg-xperia10iv.conf \
     --policy-endpoint ${ZION_POLICY_ENDPOINT}
   ```
3. Provisioning script:
   - Generates hardware-backed device keypair and CSR via StrongBox.
   - Submits CSR to Xion Device CA and installs returned certificate chain.
   - Registers device with Sentinel Lite and pulls baseline policy bundle.
   - Seeds Forensic Log metadata and rotation schedule.

### 3.7 Post-Provision Validation
- Run built-in attestation check:
  ```bash
  adb shell sentinel-lite validate --expected-profile client-mode
  adb shell zion-policy status
  ```
- Confirm WireGuard tunnel is active and only allowlisted services are reachable.
- Run the Zion runtime smoke test to validate module registration:
  ```bash
  adb shell "cd /system/zion && python3 -m compileall ."
  adb shell "cd /system/zion && python3 main.py"
  ```
  The bootstrap script exercises module startup, publishes sample telemetry, and processes a single Policy Bus cycle.

## 4. Maintenance Hooks
- **OTA Updates**: Delivered via `zion-update` system service. Validate on staging devices before promoting to production slot.
- **Policy Updates**: Authored in Policy Bus repository, signed, and published to Sentinel. Devices poll periodically and upon sentinel-lite attestation cycles.
- **Evidence Retrieval**: Use `zion-cli evidence pull --device <serial>` to collect signed forensic bundles for offline audit.

## 5. Next Steps
- Populate module repositories (`modules/`) with functional code.
- Flesh out Policy Bus schemas in `policy-bus/` directory.
- Implement Sentinel Lite Android app leveraging Zion SDK.
- Harden build pipeline with reproducible builds and transparency ledger integration.
