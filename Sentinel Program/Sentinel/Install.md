# Sentinel Android Install Guide (Sony Xperia 10 IV Focus)

This document walks through every step required to turn the **Sentinel Control** Android source tree into a deployable build that is fully optimized for the Sony Xperia 10 IV (Android 14 target). The sequence is intentionally verbose—treat it like a checklist that you can mark off line by line.

---

## 1. Prerequisites

1. **Host workstation requirements**
   - 16 GB RAM minimum (32 GB recommended) and 30 GB free SSD storage for Android Studio caches and Gradle artifacts.
   - Windows 11 Pro, macOS 13+, or Ubuntu 22.04 LTS with the latest security updates.
   - Latest Android USB drivers installed (Windows: Google USB + Sony Xperia drivers; macOS/Linux include built-in adb drivers but still install `udev` rules for Sony).
2. **Software downloads**
   - Android Studio Hedgehog (or newer) from [developer.android.com/studio](https://developer.android.com/studio).
   - Android SDK Platform 34, Android SDK Build-Tools 34.0.0, and Android Emulator images if you need virtual validation.
   - Java 17 runtime (bundled with Android Studio; install OpenJDK 17 if you are scripting builds).
3. **Sony Xperia 10 IV preparation**
   - Device on stock firmware 68.2.A or newer with battery charged above 60%.
   - USB-C data cable rated for 3 A (Sony cables provided in box work well).
   - Wi-Fi on the same LAN as the development workstation for wireless debugging fallback.

---

## 2. Clone and Inspect the Repository

1. Open a terminal and run:
   ```bash
   git clone https://example.com/AltProductionHosting.git
   cd AltProductionHosting/'Sentinel Program'/Sentinel
   ```
2. Familiarize yourself with the project layout described in `README.md`. Key Gradle entry points live at the root (`build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`), and the Android app module sits under `app/` with its manifest, Compose UI, telemetry, networking, and MFA packages.
3. Optional: run `./gradlew tasks` to ensure Gradle wrapper bootstraps correctly on your machine before opening Android Studio.

---

## 3. Configure Android Studio

1. Launch Android Studio and choose **File ▸ Open**. Point the dialog to the `Sentinel Program/Sentinel` directory so Studio imports the correct Gradle root.
2. When prompted, allow Android Studio to **Trust** the Gradle scripts and download missing SDK components.
3. In **File ▸ Settings ▸ Build, Execution, Deployment ▸ Build Tools ▸ Gradle**, ensure the Gradle JDK is set to *Embedded JDK 17*.
4. Under **File ▸ Settings ▸ Appearance & Behavior ▸ System Settings ▸ Android SDK**, install:
   - Android 14 (API 34) SDK Platform and Google Play system images.
   - Android SDK Build-Tools 34.0.0.
   - Google USB Driver (Windows) and Android Emulator.
5. Trigger a Gradle sync (top toolbar) and verify the **Build** tool window reports `BUILD SUCCESSFUL`. Resolve any dependency prompts by accepting AndroidX/Compose licenses.

---

## 4. Project Customization for Sentinel

1. Set the backend base URL or feature flags via the network SharedPreferences file in `app/src/main/java/com/sentinel/control/network/sentinel_network`. Use **Build Variants** if you maintain multiple environments.
2. Review biometric and MFA policies inside `app/src/main/java/com/sentinel/control/mfa/` to match your production security posture (fingerprint → YubiKey → smart card → PIN order).
3. Confirm the app-level `build.gradle.kts` sets `compileSdk = 34`, `minSdk = 28`, and uses `targetSdk = 34` so the build aligns with Android 14 requirements on the Xperia 10 IV.
4. Run **Code ▸ Analyze Code** to surface nullability or lint issues before deploying to hardware.

---

## 5. Prepare the Sony Xperia 10 IV

1. **Enable Developer Options**
   - On the phone, navigate to **Settings ▸ About phone ▸ Build number** and tap 7 times until you see "You are now a developer".
   - Go to **Settings ▸ System ▸ Developer options** and toggle **USB debugging** on.
   - Enable **Wireless debugging** as a backup channel.
2. **Configure USB drivers (Windows)**
   - Install the Sony USB drivers or Xperia Companion, then open **Device Manager** and update the driver for "Sony sa0114 ADB Interface" to use the Google USB driver.
3. **ADB authorization**
   - Connect the phone via USB-C. When the RSA fingerprint dialog appears, tap **Allow** and enable "Always allow from this computer".
   - Verify connectivity with `adb devices`; the Xperia 10 IV should display as `device`.
4. **Performance prep**
   - Set **Stay awake** in Developer options to keep the display on while charging.
   - Disable **Battery optimization** for Android Studio and `com.sentinel.control` once installed to prevent aggressive process kills.
   - Ensure at least 8 GB free on internal storage for APK installs and logcat traces.

---

## 6. Build and Deploy from Android Studio

1. Select the **Sentinel** run configuration (Android Studio auto-creates it based on `app`).
2. In the device picker, choose the connected **Xperia 10 IV (Android 14)** entry. If it does not appear, click **Pair using Wi-Fi**, select the device from the dialog, and follow the pairing code instructions from the phone's wireless debugging screen.
3. Click **Run (▶)**. Android Studio compiles the Compose UI, network stack, MFA modules, and packages them into an APK signed with the debug keystore.
4. Watch **Build ▸ Build Output** for `BUILD SUCCESSFUL` followed by `Installation successful`.
5. On the phone, confirm the Sentinel icon appears. Launch it, approve all biometric prompts, and verify that:
   - The device-bound EC keypair creates successfully.
   - Threat hygiene checks (root, SELinux, ADB) report "pass" for the stock Xperia firmware.
   - Network diagnostics can reach your staging endpoint over Wi-Fi and cellular.

---

## 7. Post-Install Hardening on Xperia 10 IV

1. Revoke USB debugging if production policy forbids persistent adb access: **Settings ▸ Developer options ▸ Revoke USB debugging authorizations**.
2. Configure a dedicated Work Profile or Secure Folder if the device is managed via Android Enterprise, ensuring Sentinel runs inside the secured profile.
3. Enable **SIM PIN**, **Fingerprint**, and (if available) **Face Unlock** so Sentinel can leverage full multi-factor gating.
4. Use **Settings ▸ Security ▸ More security settings ▸ Device admin apps** to confirm Sentinel has the necessary admin privileges for quarantine actions (if implemented in your build variant).
5. Capture baseline telemetry logs by running `adb logcat -s SentinelControl` during first launch; store them with your deployment artifacts for auditing.

---

## 8. Troubleshooting Checklist

| Symptom | Resolution |
| --- | --- |
| `adb devices` shows `unauthorized` | Unplug USB, toggle USB debugging off/on, accept the RSA dialog again. |
| Gradle sync fails with "compileSdkVersion is not specified" | Ensure you're opening the project at `Sentinel Program/Sentinel`, not the repo root. |
| Xperia 10 IV not listed in device picker | Install Google USB Driver, restart `adb server`, or pair wirelessly via Developer options. |
| Build stuck on `:app:mergeDebugResources` | Delete `~/.android/build-cache` and re-run; ensure antivirus exclusions for the project directory. |
| App crashes on launch due to `BiometricPrompt` | Register at least one fingerprint on the device and verify `USE_BIOMETRIC` permission remains granted. |

---

## 9. Next Steps

- Replace the debug keystore with your organization-signed release keystore and configure **Build ▸ Generate Signed App Bundle** for production distribution.
- Integrate Xperia-specific features such as Side Sense gestures or dynamic color theming if required by stakeholders.
- Document your deployment in change management systems, attaching the `adb logcat` baseline and Gradle build scans.

By following these steps, you will have a reproducible pathway from the Sentinel Android source code to a verified installation on the Sony Xperia 10 IV, ready for biometric-gated security operations.
