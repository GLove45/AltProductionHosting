# Alt Production Hosting

Alt Production Hosting blends the open-ended power of cPanel with the ease of WYSIWYG builders. The project scaffolding in this repository establishes a modular backend API, a React frontend, and supporting documentation to guide future development.

## Getting started

### Local development

1. Install dependencies in both `backend/` and `frontend/` directories (`npm install`).
2. Copy `backend/.env.example` to `backend/.env` and adjust secrets.
3. Run `npm run dev` inside `backend/` and `frontend/` to start local servers.
4. Access the UI at `http://localhost:5173`.

### Preparing a `/var/www` deployment bundle

Run [`scripts/package-var-www.sh`](scripts/package-var-www.sh) to stage files exactly as they should appear on a host where `/var/www/altproductionhosting` is the document root:

```bash
./scripts/package-var-www.sh
```

The script rebuilds the frontend and produces two helper directories:

- `var-root/` – copy its contents to `/var/www`. It includes an `altproductionhosting/` tree mirroring this repository (excluding transient items like `node_modules/`).
- `var-public/` – copy its contents to `/var/www/altproductionhosting`. This is the Vite production build with `index.html` at the correct relative paths.

After copying, your web server can serve `/var/www/altproductionhosting/index.html` immediately without additional tweaks.

### Ubuntu 25 server bootstrap

Use [`scripts/install-ubuntu25.sh`](scripts/install-ubuntu25.sh) to provision an Ubuntu 25.x host with Node.js, MongoDB, and compiled application artifacts.

```bash
sudo ./scripts/install-ubuntu25.sh
```

The script performs the following steps:

- Installs prerequisite system packages (`curl`, `git`, build tools, and OpenSSL`).
- Adds the NodeSource repository and installs Node.js 20 LTS.
- Adds the MongoDB Community Server 7.0 repository, installs it, and enables the `mongod` service.
- Generates `backend/.env` from `backend/.env.example` with a random `JWT_SECRET` if the file is missing.
- Installs project dependencies and builds both backend and frontend bundles.

After running the script, configure a process manager (for example, systemd or PM2) to run `backend/dist/server/index.js` and serve the `frontend/dist` directory through your preferred web server.

## Repository layout

- [`backend/`](backend/) – Express API supporting authentication, domain registration, hosting, and the drag-and-drop editor.
- [`frontend/`](frontend/) – React single-page application with dashboards, file manager, and editor shell.
- [`infrastructure/`](infrastructure/) – Placeholders for database migrations and infrastructure-as-code assets.
- [`docs/`](docs/) – Architecture, module guides, deployment notes, and operational checklists.
- [`scripts/`](scripts/) – Reserved for automation helpers (seeders, cron jobs).

## Documentation map

- [Architecture](docs/architecture.md)
- [Backend Module Guide](docs/backend-module-guide.md)
- [Frontend Overview](docs/frontend-overview.md)
- [Storage and Deployment](docs/storage-and-deployment.md)
- [Operational Playbook](docs/operational-playbook.md)
- [Ubuntu 25 Deployment Checklist](docs/ubuntu25-deployment.md)

For the product vision captured by stakeholders, review the original [README.txt](README.txt).
