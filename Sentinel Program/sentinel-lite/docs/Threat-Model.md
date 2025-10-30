# Sentinel Lite Threat Model

## Assets
- Device telemetry streams (events, findings, baselines).
- Update pipeline artifacts (binaries, manifests, signatures).
- Secrets at rest (device keys, MFA seeds).

## Actors
- Legitimate operators with MFA.
- Compromised local administrators.
- Remote adversaries attempting command/control.
- Supply-chain attackers targeting update distribution.

## Abuse Cases
- Tampering with append-only evidence vault.
- Forging updates to deploy malicious code.
- Exfiltrating sensitive telemetry beyond intended scope.
- Abuse of local CLI to disable protections.

Mitigations must stay aligned with `policy.yaml` semantics and exported
fields.
