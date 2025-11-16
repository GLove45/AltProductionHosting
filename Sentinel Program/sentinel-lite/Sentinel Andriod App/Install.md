# Sentinel Lite Android Install Guide (Sony Xperia 10 IV)

This guide targets the **Sentinel Lite** Android client that lives under `Sentinel Program/sentinel-lite/Sentinel Andriod App`. It explains every prerequisite, the Android Studio import process, Sony Xperia 10 IV preparation, and verification steps so you can reproducibly install the app on that hardware.

---

## 1. Workstation and Device Prerequisites

1. **Hardware and OS**
   - Laptop or desktop with at least 16 GB RAM (32 GB preferred) and 30 GB free SSD space.
   - Windows 11 Pro, macOS Ventura (13) or newer, or Ubuntu 22.04 LTS.
2. **Software**
   - [Android Studio Hedgehog or later](https://developer.android.com/studio) with the bundled JDK 17.
   - Android SDK Platform 34, Build-Tools 34.0.0, Google USB Driver (Windows), and Android Emulator images if you need virtual validation.
   - Git 2.40+ for cloning this repository.
3. **Sony Xperia 10 IV prep**
   - Stock firmware 68.2.A.x or later, battery above 60%, USB-C cable capable of reliable data transfer.
   - Wi-Fi connectivity on the same LAN as your workstation to support wireless debugging fallback.

---

## 2. Clone the Repository and Locate the Android Project

1. Open a terminal and run:
   ```bash
   git clone https://example.com/AltProductionHosting.git
   cd AltProductionHosting/'Sentinel Program'/sentinel-lite
   ```
2. Verify the Android sources live in the `Sentinel Andriod App/` directory. The structure you should see:
   - `Java/` – holds Kotlin/Java source when populated (create this tree if you add activities or fragments).
   - `layout/` – XML layouts such as `activity_main.xml`, `fragment_alerts.xml`, etc.
   - `drawable/`, `color/`, `menu/` – resource definitions for icons, palettes, and navigation.
3. Keep this path handy; Android Studio expects to open the `Sentinel Andriod App` folder so Gradle recognizes the `app` module root.

---

## 3. Import into Android Studio

1. Launch Android Studio and choose **File ▸ Open**. Select `Sentinel Program/sentinel-lite/Sentinel Andriod App`.
2. When prompted, click **Trust Project** so the Gradle scripts (from `build.gradle` / `settings.gradle`) can execute.
3. In **File ▸ Settings ▸ Build, Execution, Deployment ▸ Build Tools ▸ Gradle**, ensure the Gradle JDK uses the embedded Java 17.
4. Open **Appearance & Behavior ▸ System Settings ▸ Android SDK** and install:
   - Android 14 (API 34) SDK Platform
   - Android SDK Build-Tools 34.0.0
   - Google USB Driver (Windows) + Android Emulator
5. Trigger a Gradle sync (top toolbar). Wait for `BUILD SUCCESSFUL` in the **Build** window before proceeding.

---

## 4. Configure Sentinel Lite Build Settings

1. Open `gradle.properties` (create if missing) and set memory flags:
   ```
   org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8
   android.useAndroidX=true
   ```
2. In `app/build.gradle`, confirm `compileSdk = 34`, `minSdk = 28`, and `targetSdk = 34` to align with Xperia 10 IV.
3. Update package metadata inside `AndroidManifest.xml` (under `app/src/main/`) to match your applicationId, permissions, and exported activities.
4. Customize resources:
   - Adjust layout XMLs (`layout/fragment_nodes.xml`, `layout/fragment_alerts.xml`) to reflect the modules you need.
   - Update color accents in `color/nav_item_colors.xml` to match branding.
   - Modify menu actions in `menu/menu_bottom_nav.xml` if you add or remove navigation destinations.
5. If your build consumes Sentinel Lite configuration files (`sentinel.conf`, `policy.yaml`, etc.), place them under `assets/` or embed their values using Gradle build config fields.

---

## 5. Prepare the Sony Xperia 10 IV

1. On the phone, navigate to **Settings ▸ About phone ▸ Build number** and tap seven times to unlock Developer Options.
2. Go to **Settings ▸ System ▸ Developer options** and enable **USB debugging** and optionally **Wireless debugging**.
3. (Windows) Install the Sony USB driver, then open **Device Manager** and ensure the device enumerates as "Sony sa0114 ADB Interface" using the Google USB driver.
4. Connect the phone via USB-C. Accept the RSA fingerprint prompt and tick **Always allow from this computer**.
5. Verify connectivity with `adb devices`; the Xperia should display as `device`. If it shows `unauthorized`, replug USB and accept the prompt again.
6. Enable **Stay awake** and disable **Battery optimization** for Android Studio and (post-install) the Sentinel Lite package to avoid aggressive process killing.

---

## 6. Build and Deploy from Android Studio

1. Use the default **app** run configuration (Android Studio creates it based on `app/build.gradle`).
2. In the device chooser, select **Xperia 10 IV (Android 14)**. If absent, click **Pair using Wi-Fi** and follow the on-device pairing code instructions.
3. Click **Run (▶)**. Gradle compiles sources under `Java/` (and Kotlin if present), merges resources from `layout/`, `drawable/`, `color/`, `menu/`, then packages an APK signed with the debug keystore.
4. Watch the **Build** tool window for `BUILD SUCCESSFUL` followed by `Installation successful`.
5. On the phone, locate the Sentinel Lite icon, launch it, and verify:
   - Navigation tabs render correctly from `menu_bottom_nav.xml`.
   - Node/alert/playbook fragments inflate without layout exceptions.
   - Network calls hit your configured Sentinel backend over Wi-Fi and LTE.

---

## 7. Post-Install Validation and Hardening

1. Capture baseline telemetry with `adb logcat -s SentinelLite` (adjust tag to your logger) during first launch and store with deployment artifacts.
2. Disable **USB debugging** if policy forbids persistent ADB: **Developer options ▸ Revoke USB debugging authorizations**.
3. Secure the handset with **SIM PIN**, **Fingerprint**, and (if used) **Face Unlock** so your MFA stack has the strongest factors available.
4. If the device is EMM-managed, place Sentinel Lite inside the Work Profile and ensure the policy allows required permissions (network, sensors, notifications).
5. Document release keystore usage and plan to replace the debug keystore with your production keystore via **Build ▸ Generate Signed App Bundle / APK**.

---

## 8. Troubleshooting Quick Reference

| Symptom | Fix |
| --- | --- |
| Gradle sync fails with "compileSdkVersion is not specified" | Confirm Android Studio opened `Sentinel Program/sentinel-lite/Sentinel Andriod App`, not the repo root. |
| `adb devices` shows `offline` | Run `adb kill-server && adb start-server`, toggle USB debugging, or switch to wireless debugging. |
| Resources fail to merge (`AAPT: duplicate value`) | Inspect `drawable/` and `color/` for duplicate resource names, then clean the project (`Build ▸ Clean Project`). |
| Xperia not shown in device dropdown | Install Google USB Driver, try another USB port/cable, or use **Pair using Wi-Fi** with the pairing code. |
| App crashes on launch due to missing fragments | Make sure corresponding layout XMLs exist (e.g., `fragment_playbooks.xml`) and fragment classes reference the correct binding IDs. |

By following these steps you will consistently transform the Sentinel Lite Android sources into a deployable build that is validated on the Sony Xperia 10 IV and ready for secure operations.
