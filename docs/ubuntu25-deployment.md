# Ubuntu 25 Deployment Checklist

This guide summarizes the steps required to provision an Ubuntu 25.x server for Alt Production Hosting. Use it alongside the automation script shipped in `scripts/install-ubuntu25.sh`.

## 1. Prepare the server

1. Update the system and install baseline packages:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   sudo apt-get install -y ca-certificates curl git gnupg lsb-release build-essential unzip openssl
   ```
2. Ensure ports `4000` (API) and `5173` (default frontend dev server) are open in your firewall or security group. For production, front the backend API with a reverse proxy and serve the frontend as static files.

## 2. Run the bootstrap script

Execute the automated installer from the repository root:

```bash
sudo ./scripts/install-ubuntu25.sh
```

The script installs Node.js 20 LTS, MongoDB Community Server 7.0, project dependencies, and builds the production artifacts.

## 3. Configure services

After the script finishes:

- Verify MongoDB is running: `sudo systemctl status mongod`.
- Create a dedicated system user for the application if desired, then configure a process manager (systemd, PM2, or Supervisor) to run `node backend/dist/server/index.js`.
- Serve `frontend/dist` using nginx, Apache, or a CDN-enabled object store. When using nginx on the same host, point the document root to the `frontend/dist` directory.

## 4. Environment configuration

The installer copies `backend/.env.example` to `backend/.env` with a random `JWT_SECRET`. Review and adjust the following variables:

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
