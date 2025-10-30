# Sentinel Lite Runbooks

## Install / Upgrade / Rollback
1. Follow Installation Manual to deploy binaries.
2. Use updater client (`bin/next/`) for blue/green swaps.
3. Verify health endpoints and CLI status.
4. Roll back by flipping symlink to previous version if health fails.

## Incident Response
1. Capture current evidence vault digest.
2. Export latest bundles via `evidence/export`.
3. Isolate host using CLI `isolate` command with MFA.
4. Coordinate with SOC for containment and remediation.

## Evidence Handling
- Treat `logs/` as append-only; never rewrite entries.
- Archive daily digest hashes in secure storage.
- Document chain-of-custody whenever evidence is exported.
