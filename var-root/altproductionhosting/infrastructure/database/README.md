# Database Schema Notes

Define database migrations or schema definitions in this directory. Coordinate table design with backend repositories:

- Users ↔ [`UserRepository`](../../backend/src/modules/users/user.repository.ts)
- Domains ↔ [`DomainRepository`](../../backend/src/modules/domains/domain.repository.ts)
- Hosting spaces & files ↔ [`HostingRepository`](../../backend/src/modules/hosting/hosting.repository.ts)
- Editor drafts ↔ [`EditorRepository`](../../backend/src/modules/editor/editor.repository.ts)

Use this README to track decisions about indexes, constraints, and storage quotas.
