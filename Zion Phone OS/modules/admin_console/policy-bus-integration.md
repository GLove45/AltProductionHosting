# Policy Bus Integration for Admin Decisions

## Topics
- Define `admin.quarantine`, `admin.secure_wipe`, and `admin.evidence_export` topics.
- Specify message payload schemas and signature requirements.

## Decision Flow
- Describe how admin actions publish events and await acknowledgements.
- Include retry/backoff logic for offline operation.

## Audit Trail
- Map events to Sentinel policy logs and Forensic Logger storage.
- Reference neon checkmark motif to denote successful policy enforcement in UI.
