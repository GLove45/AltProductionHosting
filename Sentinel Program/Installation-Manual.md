# Sentinel Lite Installation Manual

This guide explains how to install the **Sentinel Lite** monitoring suite and
register it as a systemd service (`/etc/systemd/system/sentinel-lite.service`).
The instructions assume a modern Linux distribution with `systemd` and Python
3.9+.

---

## 1. Prerequisites

Install the OS packages required by Sentinel Lite:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip openssh-client
```

Optional (but recommended) packages:

- `nordvpn` CLI if you use NordVPN and want automatic VPN IP detection.
- `osquery` or `osquery-lite` for additional telemetry.
- Build tools (`build-essential`, `libffi-dev`, `libssl-dev`) when installing
  Python packages such as `paramiko` or `scapy` from source.

Create a Python virtual environment for the service:

```bash
sudo python3 -m venv /opt/sentinel-lite/.venv
sudo /opt/sentinel-lite/.venv/bin/pip install --upgrade pip
sudo /opt/sentinel-lite/.venv/bin/pip install psutil watchdog requests paramiko scapy
```

If you prefer to install the dependencies globally, replace the virtual
environment commands with the equivalent `pip install` invocations.

---

## 2. Deploy the Files

1. Copy the `sentinel-lite` directory into `/opt`:

   ```bash
   sudo mkdir -p /opt
   sudo cp -r "Sentinel Program/sentinel-lite" /opt/
   ```

2. Ensure the service account can write to the log directory:

   ```bash
   sudo mkdir -p /opt/sentinel-lite/logs
   sudo chown root:root /opt/sentinel-lite/logs
   sudo chmod 750 /opt/sentinel-lite/logs
   ```

3. (Optional) Adjust `sentinel.conf`, `manifest.json`, and
   `hash_manifest.json` to match your environment. Populate `manifest.json`
   with the SHA-256 hashes of configuration files you want to protect.

4. Update the systemd unit to point to the Python interpreter you selected
   (for example, `/opt/sentinel-lite/.venv/bin/python`). Edit
   `/opt/sentinel-lite/sentinel-lite.service` if necessary.

---

## 3. Install the systemd Service

1. Copy the service file into `/etc/systemd/system`:

   ```bash
   sudo cp /opt/sentinel-lite/sentinel-lite.service /etc/systemd/system/
   ```

2. Reload systemd units and enable Sentinel Lite to start on boot:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable sentinel-lite.service
   ```

3. Start the service and inspect the status:

   ```bash
   sudo systemctl start sentinel-lite.service
   sudo systemctl status sentinel-lite.service
   ```

4. Review the application log to confirm successful startup:

   ```bash
   sudo tail -f /opt/sentinel-lite/logs/sentinel.log
   ```

---

## 4. Command Line Usage

The CLI exposes several sub-commands:

```bash
/opt/sentinel-lite/.venv/bin/python /opt/sentinel-lite/sentinelctl.py start
/opt/sentinel-lite/.venv/bin/python /opt/sentinel-lite/sentinelctl.py force-scan
/opt/sentinel-lite/.venv/bin/python /opt/sentinel-lite/sentinelctl.py status
/opt/sentinel-lite/.venv/bin/python /opt/sentinel-lite/sentinelctl.py report
```

- `start`: Launches the monitoring loops (systemd will use this).
- `force-scan`: Runs every check once and exits (good for testing).
- `status`: Prints the last 20 lines of the log file.
- `report`: Sends a diagnostic heartbeat through the configured reporter.

---

## 5. Maintenance Tips

- Update the `hash_manifest.json` baseline after legitimate upgrades using the
  `force-scan` command or by running `ProcGuard.refresh_baseline()` manually in
  a Python shell.
- Keep the virtual environment patched (`pip list --outdated`) to receive the
  latest security updates.
- If you change VPN providers, adjust the `[network]` section in
  `sentinel.conf` to match the new interface or allowlist.
- To uninstall, stop the service, disable it, remove the unit file, and delete
  the `/opt/sentinel-lite` directory.

---

Sentinel Lite is now ready to monitor outbound network activity, critical
executables, and configuration integrity, reporting findings via HTTPS or SSH
according to your configuration.
