# Sentinel Lite Installation Manual

This guide explains how to install the **Sentinel Lite** monitoring suite and
register it as a systemd service (`/etc/systemd/system/sentinel-lite.service`).
The instructions assume a modern Linux distribution with `systemd` and Python
3.9+.

---

## Service Overview

Sentinel Lite is composed of four cooperative monitoring workers orchestrated by
`sentinelctl.py`:

- **Reporter** – asynchronously forwards alerts to an HTTPS webhook or SSH
  bastion and appends all payloads to a local JSONL log.
- **NetWatcher** – inspects outbound connections to verify that sensitive
  traffic traverses the configured VPN interface or approved remote IP
  allowlist.
- **ProcGuard** – recalculates hashes for critical executables and optionally
  uses `watchdog` to trigger alerts on disk modifications in near real-time.
- **IntegrityVerifier** – checksums configuration files listed in
  `manifest.json` on a recurring schedule.

The runtime loads configuration from `sentinel.conf`, spawns worker threads, and
relays every alert back through the Reporter so that all data sources follow the
same delivery and retention pipeline.

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

## 6. Debugging & Security Scan Results

Two health checks were run against the repository to validate the current
codebase:

| Check | Command | Outcome | Notes |
| --- | --- | --- | --- |
| Syntax verification | `python3 -m compileall sentinel-lite` | ✅ | Confirms all Python modules compile without syntax errors. |
| Static security lint | `bandit -r sentinel-lite` | ⚠️ | Flagged subprocess usage in `netwatch.py` and permissive SSH handling in `reporter.py`. Review the hardening guidance below to mitigate. |

Bandit’s warnings are informative rather than proof of exploitability. Ensure
that NordVPN CLI input is trusted and pinned, and that SSH destinations are
restricted to hardened bastions with verified host keys.

---

## 7. Function-Level Audit & Hardening Checklist

The following tables describe every callable surfaced by the main service
modules, along with operational context and security actions to keep the
installation hardened.

### `sentinelctl.py`

| Function / Method | Purpose | Security Notes |
| --- | --- | --- |
| `SentinelRuntime.__init__(config_root)` | Loads configuration, instantiates Reporter, NetWatcher, ProcGuard, and IntegrityVerifier. | Restrict file permissions on `sentinel.conf`, manifests, and `logs/` to root. Validate config paths before deployment. |
| `SentinelRuntime._load_config()` | Reads INI file from `config_root`. | Ensure the directory is writable only by administrators; treat config values as trusted input to avoid path hijacking. |
| `SentinelRuntime._build_reporter_config()` | Normalises reporter section and resolves relative log paths. | Prefer HTTPS mode; when using SSH ensure endpoints and key paths are absolute and stored on read-only filesystems. |
| `SentinelRuntime._build_netwatch()` | Creates NetWatcher with VPN interface and allowlist. | Keep allowlist minimal; store NordVPN binary at an absolute path with root-only permissions. |
| `SentinelRuntime._build_procguard()` | Assembles ProcGuard with critical paths and manifest, then refreshes baseline. | Populate `critical_paths` with immutable binaries; baseline updates should be performed under change control. |
| `SentinelRuntime._build_integrity()` | Configures IntegrityVerifier interval and manifest location. | Manifest must be generated from a trusted host; place on read-only media if possible. |
| `SentinelRuntime.start()` | Boots all monitoring threads, registers signal handlers. | Run under a dedicated systemd unit with `ProtectSystem=strict`, `ProtectHome=yes`, and resource limits. Ensure only root can send signals via systemd sandboxing. |
| `SentinelRuntime.stop()` | Stops reporter, watchdog, and signals loop exit. | Confirm systemd unit uses `KillSignal=SIGTERM` to trigger clean shutdown. |
| `SentinelRuntime._poll_network()` | Executes `NetWatcher.scan_connections()` every 30s and forwards alerts. | Limit thread permissions via systemd `RestrictAddressFamilies=` to reduce exposure. |
| `SentinelRuntime._poll_procguard()` | Runs `ProcGuard.compare()` every 60s. | Keep manifest in sync; false positives indicate baseline drift or tampering. |
| `_cmd_start(args)` | CLI handler for long-running service. | Launch via systemd with `ExecStart` using absolute interpreter paths. |
| `_cmd_force_scan(args)` | Runs single pass of all monitors and reports results. | Use for change-management validation; outputs may include sensitive paths—store logs securely. |
| `_cmd_status(args)` | Prints trailing log lines to stdout. | Restrict shell access; log file may contain sensitive indicators. |
| `_cmd_report(args)` | Sends informational heartbeat. | Use to verify reporter pipeline after credential rotation. |
| `build_parser()` / `main()` | CLI entry points. | Ensure only trusted operators invoke CLI; wrap in sudoers rule if necessary. |

### `netwatch.py`

| Function / Method | Purpose | Security Notes |
| --- | --- | --- |
| `NetWatcherConfig` | Dataclass storing VPN interface, allowlist, NordVPN binary path. | Set `nordvpn_binary` to an absolute path owned by root. |
| `NetWatcher.__init__(config)` | Accepts explicit config or loads from environment. | Avoid setting environment variables globally; prefer config file. |
| `NetWatcher._load_config_from_env()` | Builds config from env vars. | Ensure env is sourced from root-only profile; sanitize allowlist values. |
| `NetWatcher.scan_connections()` | Iterates `psutil.net_connections` and returns alerts for suspicious endpoints. | Requires `CAP_NET_ADMIN`; use `AmbientCapabilities=CAP_NET_ADMIN` in systemd rather than running as non-root with sudo. |
| `NetWatcher._extract_ip(endpoint)` | Normalises socket endpoints to IP strings. | No special handling needed. |
| `NetWatcher._discover_vpn_ip()` | Runs NordVPN CLI then falls back to Scapy route table. | Bandit flagged subprocess usage—pin CLI path, ensure binary is signed, and run with `PATH` locked down in systemd unit. |
| `NetWatcher._is_suspicious(local_ip, remote_ip, vpn_ip)` | Determines if connection violates policy. | Keep allowlist curated; log decisions for auditing. |
| `NetWatcher._format_alert(conn, vpn_ip)` | Builds alert dict for reporter. | Alerts may include IPs—treat logs as sensitive data. |

### `procguard.py`

| Function / Method | Purpose | Security Notes |
| --- | --- | --- |
| `ProcGuardConfig` | Dataclass for monitored paths and hash manifest location. | Store manifest on read-only partition with root ownership. |
| `HashBaseline.__init__(manifest_path)` | Loads baseline hashes on startup. | Validate manifest integrity (`chmod 600`). |
| `HashBaseline._load()` | Reads JSON manifest or starts fresh. | Monitor for JSON tampering; integrate with `IntegrityVerifier`. |
| `HashBaseline.save()` | Writes updated hashes. | Only run during controlled baseline refresh; consider signing manifest. |
| `HashBaseline.get(path)` / `set(path, digest)` / `items()` | Manage hash entries. | No additional notes. |
| `ProcGuard.__init__(config)` | Loads baseline helper. | Provide absolute paths to avoid directory traversal. |
| `ProcGuard.compute_hash(path)` | Calculates SHA-256 for file. | Requires read access; ensure world-readable binaries are acceptable targets. |
| `ProcGuard.refresh_baseline()` | Updates baseline with current hashes. | Run immediately after trusted deployments only. |
| `ProcGuard.compare()` | Detects deviations and emits alerts. | Investigate every mismatch; baseline is saved only when alerts triggered, preserving forensic evidence. |
| `ProcGuard.start_watchdog(callback)` | Enables filesystem monitoring with `watchdog`. | Requires inotify; ensure directories exist and are root-owned to prevent TOCTOU attacks. |
| `ProcGuard.stop_watchdog()` | Stops observer thread. | Called on shutdown for clean exit. |

### `integrity.py`

| Function / Method | Purpose | Security Notes |
| --- | --- | --- |
| `IntegrityConfig` | Manifest path and scan interval. | Choose conservative interval (e.g., 300s) for high-sensitivity configs. |
| `IntegrityVerifier.__init__(config)` | Loads manifest into memory. | Raises immediately if manifest missing—monitor systemd logs for startup failure. |
| `IntegrityVerifier._load_manifest()` | Reads JSON manifest. | Treat manifest as authoritative; verify via offline signing where possible. |
| `IntegrityVerifier._hash_file(path)` | Computes SHA-256 digest. | Works on binary or text; ensure files remain accessible. |
| `IntegrityVerifier.verify_once()` | Compares expected vs actual hashes, records missing files. | Alerts surface via reporter; respond quickly to `checksum_mismatch`. |
| `IntegrityVerifier.run_forever(callback)` | Schedules recurring verification loop. | Use systemd `Restart=on-failure` to recover from unexpected errors. |

### `reporter.py`

| Function / Method | Purpose | Security Notes |
| --- | --- | --- |
| `ReporterConfig` | Defines transport mode, endpoints, SSH credentials, local log path. | Store keys with `chmod 600`, restrict log path to root-only. |
| `Reporter.__init__(config)` | Creates internal queue and worker thread. | Run service under dedicated user with limited privileges. |
| `Reporter.start()` / `stop()` | Manage background worker lifecycle. | Ensure `stop()` is called on shutdown to flush queue. |
| `Reporter.submit(payload)` | Enqueues alert dictionaries. | Payloads may contain sensitive metadata; keep log directory encrypted if possible. |
| `Reporter._worker()` | Processes queue, dispatches payloads, appends log. | Consider rate limiting or circuit breaking to avoid network overload. |
| `Reporter._send_https(payload)` | POSTs JSON to webhook using `requests`. | Validate HTTPS endpoint certificates; use mutual TLS for highest assurance. |
| `Reporter._send_ssh(payload)` | Writes payload via Paramiko `exec_command`. | Bandit warns about `AutoAddPolicy`. Pre-populate `known_hosts`, set `client.load_host_keys()` before connecting, and restrict `endpoint` to static files to avoid command injection. |
| `Reporter._append_local_log(payload)` | Persists JSON lines to local file. | Rotate logs regularly and enforce disk quotas. |

---

## 8. Hardening Recommendations

To reach the highest level of security when operating Sentinel Lite:

1. **Systemd sandboxing** – enable `ProtectSystem=strict`,
   `ProtectHome=yes`, `PrivateTmp=yes`, `NoNewPrivileges=yes`, and
   `RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6` in the unit file.
2. **Credential hygiene** – store SSH keys in `/etc/sentinel-lite/keys` with
   `chmod 600`, disable password authentication on the destination host, and
   pin host fingerprints using `ssh-keyscan` prior to service launch.
3. **Network policy** – restrict outbound network traffic via `ufw`/`nftables`
   to the VPN interface and whitelisted monitoring endpoints. Review
   `netwatch.py` allowlists after every incident response.
4. **Integrity baselines** – after planned upgrades run `sentinelctl.py
   force-scan` to refresh manifests under change control, then commit the new
   hashes to version control or a secure secrets store.
5. **Alert routing** – configure the Reporter to use HTTPS with mutual TLS where
   possible. If SSH mode is mandatory, set `known_hosts` manually and change
   `Reporter._send_ssh` to remove `AutoAddPolicy` in custom deployments.

---

Sentinel Lite is now ready to monitor outbound network activity, critical
executables, and configuration integrity, reporting findings via HTTPS or SSH
according to your configuration.
