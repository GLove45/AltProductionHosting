# Sentinel Central AI Installation and Bashboard Setup

> **Audience**: Site reliability engineers and platform operators bringing Sentinel Central AI online across Raspberry Pi clusters that already hold a synced Git checkout.
>
> **Scope**: This runbook explains how to prepare the operating system, configure hardware accelerators (AI HAT TOPS), bootstrap the Sentinel Central AI services, wire the operator bashboard, and roll out updates. Every step is intentionally verbose to support day-zero and day-two operations.

---

## 1. Cluster Topology Overview

1. **Controller node** – One Raspberry Pi 5 (8 GB) that hosts the Sentinel Central AI coordinator, policy engine, and bashboard services.
2. **Sensor nodes** – One or more Raspberry Pi 5 (4 GB+) with AI HAT TOPS accelerators that push telemetry, feature windows, and inference metadata to the controller.
3. **Networking** – All nodes share the same management VLAN with static DHCP leases and outbound access to internal package mirrors.
4. **Storage** – Controller maintains `/opt/sentinel/data` on SSD (USB 3.0 enclosure) with a minimum 250 GB free; sensor nodes retain 32 GB for local buffering under `/var/lib/sentinel`.
5. **Authentication** – SSH public-key trust anchored from controller to every sensor node for automated orchestration.

---

## 2. Operating System Preparation (Run Once Per Node)

The Git checkout is already present at `/opt/sentinel/AltProductionHosting`. Perform the remaining prerequisites:

1. **Update OS packages**
   ```bash
   sudo apt update && sudo apt -y full-upgrade
   sudo reboot
   ```
   Reconnect after reboot before continuing.

2. **Install base dependencies**
   ```bash
   sudo apt install -y python3.11 python3.11-venv python3-pip python3-dev git rsync tmux redis-server
   ```

3. **Enable Redis (controller only)**
   ```bash
   sudo systemctl enable --now redis-server
   sudo systemctl status redis-server
   ```
   Confirm status reports *active (running)*.

4. **Provision Sentinel system user**
   ```bash
   sudo useradd --system --home /opt/sentinel --shell /usr/sbin/nologin sentinel
   sudo mkdir -p /opt/sentinel
   sudo chown sentinel:sentinel /opt/sentinel
   ```

5. **Mount high-speed storage (controller)**
   ```bash
   sudo mkdir -p /opt/sentinel/data
   sudo chown sentinel:sentinel /opt/sentinel/data
   ```

---

## 3. AI HAT TOPS Accelerator Enablement

To ensure Sentinel has full access to every accelerator:

1. **Install vendor kernel modules** (run on each node with an AI HAT)
   ```bash
   curl -sSL https://aihat.local/install.sh | sudo bash
   ```
   The installer registers the `ai_hat` kernel module and creates `/dev/ai_hat*` devices.

2. **Verify kernel module**
   ```bash
   lsmod | grep ai_hat
   ```
   Output should list `ai_hat` with the expected version and dependency count.

3. **Assign device permissions**
   ```bash
   sudo groupadd -f ai_hat
   sudo usermod -aG ai_hat sentinel
   sudo udevadm control --reload
   sudo udevadm trigger --attr-match=subsystem=ai_hat
   ```

4. **Persistent udev rule**
   Create `/etc/udev/rules.d/60-ai-hat.rules` with:
   ```
   KERNEL=="ai_hat*", MODE="0660", GROUP="ai_hat"
   ```

5. **Health check**
   ```bash
   sudo -u sentinel AI_HAT_VISIBLE_DEVICES=all \
     /opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel\ Central\ AI/sentinel_central_ai/scripts/accelerator_check.py
   ```
   The script must report every node’s TOPS budget (e.g., `Node pi-sensor-01 → 16 TOPS`). Investigate missing nodes before proceeding.

6. **Central registry (controller)**
   Populate `/etc/sentinel/accelerators.yml`:
   ```yaml
   controller: pi-controller
   nodes:
     - id: pi-sensor-01
       host: 10.0.20.31
       tops: 16
     - id: pi-sensor-02
       host: 10.0.20.32
       tops: 32
   ```
   Ensure every node participating in Sentinel is listed with accurate TOPS capacity.

---

## 4. Python Environment & Dependencies

All commands below run on the controller unless specified.

1. **Create virtual environment**
   ```bash
   cd /opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel\ Central\ AI
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip wheel setuptools
   ```

2. **Install Sentinel packages**
   ```bash
   pip install -e ./sentinel_central_ai
   pip install -r sentinel_central_ai/requirements/production.txt
   ```

3. **Bootstrap configuration files**
   ```bash
   cp sentinel_central_ai/config/defaults.yml /etc/sentinel/config.yml
   sudo chown sentinel:sentinel /etc/sentinel/config.yml
   ```

4. **Environment variables**
   Append to `/etc/profile.d/sentinel.sh`:
   ```bash
   export SENTINEL_HOME=/opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel\ Central\ AI
   export SENTINEL_CONFIG=/etc/sentinel/config.yml
   export SENTINEL_DATA=/opt/sentinel/data
   export AI_HAT_VISIBLE_DEVICES=all
   ```
   Reload environment with `source /etc/profile.d/sentinel.sh`.

---

## 5. Database & Telemetry Wiring

1. **SQLite migration**
   ```bash
   sudo -u sentinel SENTINEL_CONFIG=/etc/sentinel/config.yml \
     /opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel\ Central\ AI/.venv/bin/python \
     -m sentinel_central_ai.scripts.init_feature_store --database $SENTINEL_DATA/features.db
   ```

2. **Redis integration (optional)** – Already enabled in Section 2. Confirm connectivity:
   ```bash
   redis-cli ping
   ```
   Expect `PONG`.

3. **Sensor node telemetry agent**
   On each sensor node:
   ```bash
   cd /opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e .
   SENTINEL_CONTROLLER_URL=http://pi-controller:8080 \
     AI_HAT_VISIBLE_DEVICES=all \
     python -m sentinel.agent --config configs/sensor.yml
   ```
   Confirm logs show successful handshake with the controller.

---

## 6. Service Unit Files

Create `systemd` units to manage Sentinel automatically.

### 6.1 Controller services

1. **sentinel-bootstrap.service**
   ```ini
   [Unit]
   Description=Sentinel Central AI Bootstrap
   After=network-online.target redis-server.service
   Wants=network-online.target

   [Service]
   Type=notify
   User=sentinel
   Group=sentinel
   WorkingDirectory=/opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel Central AI
   EnvironmentFile=-/etc/default/sentinel
   ExecStart=/opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel Central AI/.venv/bin/python -m sentinel_central_ai.main --config /etc/sentinel/config.yml --mode coordinator
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

2. **sentinel-bashboard.service**
   ```ini
   [Unit]
   Description=Sentinel Operator Bashboard
   After=sentinel-bootstrap.service

   [Service]
   Type=simple
   User=sentinel
   Group=sentinel
   WorkingDirectory=/opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel Central AI
   ExecStart=/opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel Central AI/.venv/bin/python -m sentinel_central_ai.ui.dashboard --config /etc/sentinel/config.yml --bind 0.0.0.0:8443
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable services**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now sentinel-bootstrap.service sentinel-bashboard.service
   sudo systemctl status sentinel-bootstrap.service
   sudo systemctl status sentinel-bashboard.service
   ```

### 6.2 Sensor services

1. **sentinel-sensor@.service** (template)
   ```ini
   [Unit]
   Description=Sentinel Sensor Agent %i
   After=network-online.target

   [Service]
   Type=simple
   User=sentinel
   Group=ai_hat
   WorkingDirectory=/opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel
   Environment=SENTINEL_CONTROLLER_URL=http://pi-controller:8080
   Environment=AI_HAT_VISIBLE_DEVICES=all
   ExecStart=/opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel/.venv/bin/python -m sentinel.agent --config configs/sensor-%i.yml
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

2. **Activate sensor instance**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now sentinel-sensor@default.service
   ```

---

## 7. Bashboard Access & Validation

1. **TLS certificates**
   - Place certificates under `/etc/sentinel/certs/` with `sentinel.crt` and `sentinel.key`.
   - Update `/etc/default/sentinel`:
     ```
     SENTINEL_TLS_CERT=/etc/sentinel/certs/sentinel.crt
     SENTINEL_TLS_KEY=/etc/sentinel/certs/sentinel.key
     ```
   - Reload the bashboard service.

2. **Firewall adjustments**
   ```bash
   sudo ufw allow 8443/tcp comment "Sentinel Bashboard"
   sudo ufw reload
   ```

3. **Initial login**
   Navigate to `https://pi-controller:8443` and log in with the bootstrap credentials specified in `/etc/sentinel/config.yml` (default `admin` / `change-me-now`). You will be prompted to rotate the password.

4. **Accelerator visibility check**
   - From the bashboard, open **System → Accelerators**.
   - Verify each node reports correct TOPS utilization.
   - If a node is missing, confirm the sensor service and AI HAT permissions.

5. **Telemetry sanity test**
   ```bash
   sudo -u sentinel /opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel Central AI/.venv/bin/python -m sentinel_central_ai.tools.generate_test_alert
   ```
   Within the bashboard, ensure the test alert appears with decision timeline and accelerator metrics.

---

## 8. Update & Rollout Procedure

1. **Fetch latest code**
   ```bash
   cd /opt/sentinel/AltProductionHosting
   git fetch origin
   git switch main
   git pull --ff-only
   ```

2. **Review release notes**
   - Inspect `CHANGELOG.md` (if provided) or release tags for migration notices.
   - Update `/etc/sentinel/config.yml` according to documented schema changes.

3. **Reinstall dependencies (if required)**
   ```bash
   cd 'Sentinel Program'/Sentinel\ Central\ AI
   source .venv/bin/activate
   pip install -e ./sentinel_central_ai
   pip install -r sentinel_central_ai/requirements/production.txt
   ```

4. **Database migrations**
   ```bash
   sudo -u sentinel SENTINEL_CONFIG=/etc/sentinel/config.yml \
     /opt/sentinel/AltProductionHosting/'Sentinel Program'/Sentinel Central AI/.venv/bin/python \
     -m sentinel_central_ai.scripts.migrate --database $SENTINEL_DATA/features.db
   ```

5. **Rolling restart**
   - Restart controller services:
     ```bash
     sudo systemctl restart sentinel-bootstrap.service sentinel-bashboard.service
     ```
   - Restart each sensor sequentially to preserve coverage:
     ```bash
     for node in pi-sensor-01 pi-sensor-02; do
       ssh $node 'sudo systemctl restart sentinel-sensor@default.service'
     done
     ```

6. **Post-update validation**
   - Confirm services are active.
   - Run the telemetry sanity test from Section 7.5.
   - Review bashboard for schema or metric anomalies.

7. **Rollback plan**
   - Maintain snapshots of `/opt/sentinel/AltProductionHosting` via `rsync` prior to updates.
   - If failure occurs, revert Git checkout and reinstall previous dependencies:
     ```bash
     git reset --hard <previous-tag>
     pip install -r sentinel_central_ai/requirements/production.txt
     sudo systemctl restart sentinel-bootstrap.service sentinel-bashboard.service
     ```

---

## 9. Operational Tips

- **Log locations** – Controller logs under `/var/log/sentinel/coordinator.log`, sensor logs under `/var/log/sentinel/sensor-<id>.log`.
- **Resource monitoring** – Use `htop` with the *AI HAT* columns enabled to watch TOPS consumption live.
- **Security posture** – Rotate TLS keys every 90 days and enforce `ufw default deny` with explicit Sentinel allowances.
- **Backups** – Schedule nightly `sqlite3 $SENTINEL_DATA/features.db ".backup /opt/sentinel/backups/features.db"` jobs.
- **Incident response** – Run `python -m sentinel_central_ai.tools.snapshot --output /tmp/sentinel-snapshot.tar.gz` when exporting state for analysis.

---

## 10. Support Matrix & Escalation

| Component | Version | Notes |
| --- | --- | --- |
| Raspberry Pi OS | Bookworm (64-bit) | Kernel 6.1+ required for AI HAT drivers |
| Python | 3.11.x | Must match across controller and sensors |
| Redis | 7.x | Optional but recommended for queue mirroring |
| Sentinel Central AI | Latest `main` branch | Tag deployments for traceability |
| AI HAT Drivers | 2.3.1 | Provides TOPS virtualization API |

**Escalation path**:
1. File an issue in the internal tracker under *Sentinel/Operations*.
2. Page the on-call engineer via OpsGenie if bashboard uptime < 99%.
3. Email `sentinel-support@corp.example` for vendor-level accelerator bugs.

---

## 11. Appendix: Quick Verification Checklist

- [ ] Controller node has Sentinel services enabled and running.
- [ ] Every sensor node registers in `/etc/sentinel/accelerators.yml` with accurate TOPS values.
- [ ] AI HAT devices owned by group `ai_hat` and accessible to user `sentinel`.
- [ ] Bashboard reachable over HTTPS with valid certificate.
- [ ] Telemetry sanity test produces visible alert and associated accelerator metrics.
- [ ] Update procedure documented in ticketing system after each rollout.

