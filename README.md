# Alt Production Hosting

Alt Production Hosting blends the open-ended power of cPanel with the ease of WYSIWYG builders. The project scaffolding in this repository establishes a modular backend API, a React frontend, and supporting documentation to guide future development.

## Getting started

1. Install dependencies in both `backend/` and `frontend/` directories (`npm install`).
2. Copy `.env.example` (to be created) to `.env` in `backend/` and adjust secrets.
3. Run `npm run dev` inside `backend/` and `frontend/` to start local servers.
4. Access the UI at `http://localhost:5173`.

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

For the product vision captured by stakeholders, review the original [README.txt](README.txt).
