# Scripts

Place automation and maintenance scripts here. Examples include:

- Seeders that provision demo domains and hosting spaces.
- Cron jobs to archive stale editor drafts.
- CLIs to trigger site publishing or storage audits.

Document script usage here and reference related modules in [`docs/operational-playbook.md`](../docs/operational-playbook.md).

## Available scripts

### `check-services.sh`

Runs a lightweight diagnostic to verify that the backend API and frontend web server are reachable on the expected ports.

```bash
./scripts/check-services.sh
```

Environment variables allow you to customize the probe without editing the file:

- `FRONTEND_PORT` – Frontend listener (defaults to `10083`).
- `BACKEND_PORT` – Backend API port (defaults to `4000`).
- `HOST` – Target host (defaults to `localhost`).
- `BACKEND_HEALTH_PATH` – Path appended to the backend URL (defaults to `/healthz`).

The script also checks the backend `.env` (or `.env.example`) to flag accidental usage of port 80, which is reserved on the deployment host.

### `sync-repo.sh`

Clones (if needed) and pulls this repository into `/var/www/altproductionhosting`. The script determines the repository URL from the current checkout's `origin` remote, but you can override it with the `REPO_URL` environment variable. The destination directory can also be customized via `TARGET_DIR`.

```bash
# From the repository root
./scripts/sync-repo.sh

# Override the repository URL or target directory if necessary
REPO_URL="git@github.com:example/AltProductionHosting.git" TARGET_DIR="/srv/alt" ./scripts/sync-repo.sh
```

Make sure the user running the script has permission to create or update the destination directory (e.g., `/var/www`).
