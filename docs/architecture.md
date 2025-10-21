# Alt Production Hosting Architecture

Alt Production Hosting combines domain registration, file-based hosting, and a drag-and-drop editor in a modular architecture. The solution is separated into a **backend API**, a **React frontend**, and **infrastructure provisioning** scripts.

- [Backend Module Guide](backend-module-guide.md) details Express route handlers, services, and repositories that expose authentication, domain registration, hosting, and editor capabilities.
- [Frontend Overview](frontend-overview.md) walks through React routes, shared UI components, and data-fetch hooks that surface the hosting workflows.
- [Storage and Deployment](storage-and-deployment.md) explains persistence concerns, deployment flows, and integration points for registrars and object storage.
- [Operational Playbook](operational-playbook.md) covers environment configuration, development tooling, and recommended CI/CD checks.

## High-level flow

1. **Authentication**: Users register and obtain JWT tokens via `POST /api/auth`. Tokens protect subsequent operations.
2. **Domain registration**: Users submit desired domains to `/api/domains`. The backend persists domain metadata and issues verification tokens.
3. **Hosting spaces**: Users create storage allocations with `/api/hosting/spaces` and manage files for each space via `/files` endpoints.
4. **Visual editor**: Templates and drag-and-drop session data are fetched from `/api/editor`. Publishing triggers deployment pipelines that push generated assets to the hosting runtime.

![Architecture diagram](./images/architecture-diagram.png)

> **Note:** The diagram acts as a placeholder; replace it with a generated image during implementation.

## Key directories

| Directory | Purpose |
|-----------|---------|
| `backend/` | Express + TypeScript API serving auth, domain, hosting, and editor modules. |
| `frontend/` | React + Vite single-page app with dashboards, editor canvas, and auth forms. |
| `infrastructure/` | Placeholders for database migrations and infrastructure as code templates. |
| `docs/` | Living documentation for developers, operators, and support staff. |
| `scripts/` | Utility scripts for seeding data, provisioning environments, or running maintenance jobs. |

Refer to the [root README](../README.md) for a quick-start checklist and links to supplementary docs.
