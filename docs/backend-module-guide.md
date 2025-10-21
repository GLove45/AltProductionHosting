# Backend Module Guide

The backend is written in TypeScript using Express. Modules follow a **controller → service → repository** pattern with type definitions to maintain contract clarity.

## Entry point

- [`src/server/index.ts`](../backend/src/server/index.ts) bootstraps Express, applies middleware, and registers feature routes via [`src/routes/index.ts`](../backend/src/routes/index.ts).
- Environment variables are loaded through [`src/config/env.ts`](../backend/src/config/env.ts), which provides typed accessors for runtime configuration.

## Feature routes

| Route | Controller | Service | Repository | Purpose |
|-------|------------|---------|------------|---------|
| `/api/auth` | [`auth.controller.ts`](../backend/src/modules/auth/auth.controller.ts) | [`auth.service.ts`](../backend/src/modules/auth/auth.service.ts) | [`user.repository.ts`](../backend/src/modules/users/user.repository.ts) | User registration, login, and profile retrieval. |
| `/api/domains` | [`domain.controller.ts`](../backend/src/modules/domains/domain.controller.ts) | [`domain.service.ts`](../backend/src/modules/domains/domain.service.ts) | [`domain.repository.ts`](../backend/src/modules/domains/domain.repository.ts) | Domain registration, lookup, and verification workflows. |
| `/api/hosting` | [`hosting.controller.ts`](../backend/src/modules/hosting/hosting.controller.ts) | [`hosting.service.ts`](../backend/src/modules/hosting/hosting.service.ts) | [`hosting.repository.ts`](../backend/src/modules/hosting/hosting.repository.ts) | Hosting space lifecycle, file upload, and deletion. |
| `/api/editor` | [`editor.controller.ts`](../backend/src/modules/editor/editor.controller.ts) | [`editor.service.ts`](../backend/src/modules/editor/editor.service.ts) | [`editor.repository.ts`](../backend/src/modules/editor/editor.repository.ts) | Drag-and-drop editor templates, drafts, and publishing queue. |

## Types and validation

Each module exposes TypeScript interfaces defining payloads and entities:

- Auth interfaces in [`auth.types.ts`](../backend/src/modules/auth/auth.types.ts) keep registration payloads and token shapes consistent between layers.
- Domain types in [`domain.types.ts`](../backend/src/modules/domains/domain.types.ts) encode registrar data and verification states.
- Hosting shapes in [`hosting.types.ts`](../backend/src/modules/hosting/hosting.types.ts) describe file metadata and storage usage.
- Editor types in [`editor.types.ts`](../backend/src/modules/editor/editor.types.ts) represent templates, drafts, and publish requests.

> Extend these modules with validation middleware (e.g., `express-validator`) and persistence adapters (MongoDB, PostgreSQL, or S3) as you connect to production systems.
