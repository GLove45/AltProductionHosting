# Ubuntu 25 Deployment Checklist

This guide summarizes the steps required to provision an Ubuntu 25.x server for Alt Production Hosting. The automation script shipped in `scripts/install-ubuntu25.sh` now performs a full installation, including dependency setup, service provisioning, and nginx configuration for `www.altproductionhosting.com`.

## 1. Prepare the server

1. Update the system packages (optional but recommended):
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```
2. Ensure ports `80` (nginx) and `4000` (internal API) are permitted in your firewall or security group. The installer configures nginx to listen on port 80 and proxy `/api` traffic to the backend service running on port 4000.

## 2. Run the bootstrap script

Execute the automated installer from the repository root:

```bash
sudo ./scripts/install-ubuntu25.sh
```

The script installs Node.js 20 LTS, MongoDB Community Server 7.0, nginx, project dependencies, and builds the production artifacts. It also synchronizes the repository to `/opt/altproductionhosting`, creates a dedicated `altproduction` system user, and deploys the backend and frontend.

## 3. Post-install checks

After the script finishes, perform these quick verifications:

- Confirm MongoDB is running: `sudo systemctl status mongod`.
- Confirm the backend service is active: `sudo systemctl status altproductionhosting.service`.
- Confirm nginx is serving the frontend: `sudo systemctl status nginx` and visit `http://www.altproductionhosting.com/`.

## 4. Environment configuration

The installer copies `backend/.env.example` to `/opt/altproductionhosting/backend/.env` with a random `JWT_SECRET`. Review and adjust the following variables (edit the file in place and restart the `altproductionhosting.service` unit afterwards):

| Variable | Description |
|----------|-------------|
| `PORT` | Listening port for the backend API (default `4000`). |
| `MONGO_URI` | Connection string for MongoDB. Update if running MongoDB on a different host or using MongoDB Atlas. |
| `JWT_SECRET` | Secret used to sign JWTs. Generated automatically if missing. |
| `STORAGE_BUCKET` | Identifier for the object storage bucket. Update when integrating with S3-compatible storage. |
| `FILE_UPLOAD_LIMIT_MB` | Maximum upload size accepted by the API. |

## 5. Optional hardening

- Configure automatic security updates with `unattended-upgrades`.
- Use nginx or Caddy to terminate TLS and enforce HTTPS.
- Add MongoDB authentication (`mongod --auth`) and create application users in accordance with your security policies.
- Set up centralized logging (e.g., with `journald` forwarding, Fluent Bit, or your preferred log shipper).

## 6. Backups and monitoring

- Schedule regular MongoDB backups (mongodump or managed backup service).
- Monitor systemd units for failures and integrate with your alerting platform (PagerDuty, Opsgenie, etc.).
- Track disk usage of the uploads directory (`STORAGE_BUCKET`) and ensure rotation policies are in place.

With these steps completed, the server is ready to host Alt Production Hosting in a production-like environment.
