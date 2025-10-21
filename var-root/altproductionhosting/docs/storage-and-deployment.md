# Storage and Deployment

This document outlines how to evolve the prototypes in `/backend` and `/frontend` into a production-ready hosting platform.

## Persistence layers

- **Database**: Replace in-memory repositories with a managed database (PostgreSQL, MongoDB). Define schemas inside `infrastructure/database/` and extend repositories to use ORM/ODM queries.
- **Object storage**: Host static assets and user uploads in S3-compatible storage. Update `HostingRepository` to stream files to the bucket referenced by `STORAGE_BUCKET`.
- **Domain registrar**: Integrate with registrar APIs (Namecheap, Cloudflare) in `DomainService`. Store verification tokens and provider metadata.

## Deployment pipeline

1. Build the backend container using `backend/Dockerfile` (to be added) and run migrations.
2. Build the frontend with `npm run build` to generate static assets.
3. Publish assets to a CDN-backed bucket.
4. Deploy the backend API to your hosting environment (Kubernetes, serverless, or VM) and configure HTTPS.

See [`operational-playbook.md`](operational-playbook.md) for CI/CD automation ideas.
