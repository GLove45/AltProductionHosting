# Operational Playbook

## Local development

1. Install dependencies in `backend/` and `frontend/` (`npm install`).
2. Start the backend API with `npm run dev` inside `backend/`.
3. Run the frontend with `npm run dev` inside `frontend/`.

For production-like Ubuntu hosts, execute the automated bootstrap script described in the [Ubuntu 25 Deployment Checklist](ubuntu25-deployment.md).

Environment variables consumed by [`env.ts`](../backend/src/config/env.ts):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Express listening port. |
| `MONGO_URI` | `mongodb://localhost:27017/alt-hosting` | Database connection string. |
| `JWT_SECRET` | `change-me` | Secret for signing JWT tokens. |
| `STORAGE_BUCKET` | `local-storage` | Identifier for object storage bucket. |
| `FILE_UPLOAD_LIMIT_MB` | `500` | Payload limit for file uploads. |

## Testing & linting

- Backend linting: `npm run lint` in `backend/` (ESLint for TypeScript).
- Frontend linting: `npm run lint` in `frontend/`.
- Add unit tests with Jest and component tests with Testing Library as the project matures.

## CI/CD checklist

- Install dependencies, run linting, and execute automated tests for both backend and frontend.
- Build frontend assets and backend TypeScript output.
- Package Docker images and push to container registry.
- Apply infrastructure changes via Terraform scripts in `infrastructure/terraform/` (placeholders).

For deployment strategies, cross-reference the [Storage and Deployment](storage-and-deployment.md) document.
