# AltProductionHosting Control Panel

This folder hosts a lightweight cPanel-style web UI that binds access to a passkey/YubiKey using WebAuthn.
It listens on port **8080** by default and exposes orchestration endpoints to manage system packages listed
in `packages.txt`.

## Quick start

```bash
cd ControlPanel
npm install
npm start
```

Then open `http://localhost:8080` and register a passkey/YubiKey. Authentication is required before the
package orchestration view is accessible.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `CONTROL_PANEL_PORT` | Server port | `8080` |
| `CONTROL_PANEL_RP_ID` | WebAuthn RP ID | `localhost` |
| `CONTROL_PANEL_RP_NAME` | WebAuthn RP name | `AltProductionHosting Control Panel` |
| `CONTROL_PANEL_ORIGIN` | WebAuthn origin | `http://localhost:8080` |
| `CONTROL_PANEL_SESSION_SECRET` | Session secret | random per start |
| `CONTROL_PANEL_APPLY` | Execute system changes | `false` (dry run) |

## Orchestration model

`/api/packages/:name/action` supports `install`, `remove`, `update`, and `restart` against the packages
listed in `packages.txt`. By default, commands are returned in **dry-run** mode so they can be reviewed
and audited. Set `CONTROL_PANEL_APPLY=true` to execute system-level changes.

## Control plane + execution plane

The control panel now writes **declarative state** and queues **jobs** instead of directly invoking
system commands. This splits the architecture into:

- **Control plane** (Express API): writes desired state into `state/state.json` and enqueues jobs in
  `jobs/pending/`.
- **Execution plane** (agent): a separate process (`node agent/agent.js`) that consumes queued jobs
  and runs allowlisted operations.
- **Reconciler**: `node orchestrator/reconciler.js` scans desired state and queues any missing work.

### State store

Desired state lives in `state/state.json` and contains tenants, domains, certificates, and plan metadata.

### Job queue layout

```
jobs/
  pending/
  running/
  completed/
  failed/
```

### Tenant provisioning flows

The following API endpoints write state and enqueue work:

- `POST /api/tenants` → creates a tenant and queues `tenant.provision`
- `POST /api/domains` → creates a domain and queues `domain.provision`
- `POST /api/certificates` → creates a certificate record and queues `cert.issue`

Run the agent separately to execute queued jobs:

```bash
node agent/agent.js
```

Reconcile desired state on demand:

```bash
node orchestrator/reconciler.js
```

## Security notes

- WebAuthn attestation is configured for **user verification** and resident keys to favor YubiKey/passkey
  flows during registration.
- Credentials are stored in `ControlPanel/data/credentials.json`. Secure the file and consider moving to
  a dedicated secrets store for production use.
- The control panel no longer executes privileged actions directly; jobs are allowlisted and executed
  by a separate agent process.
