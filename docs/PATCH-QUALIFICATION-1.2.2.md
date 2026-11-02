# Patch Qualification 1.2.2

## Scope

Idempotent verified settings registration, ready-time retry, lazy menu actions, and safe foregrounding.

## Automated qualification

- Tests: 35/35
- English/German localization parity: 87/87
- Static validation: passed
- Manifest paths and dependencies: passed
- Runtime archive path safety: passed
- Repeated deterministic builds: required by release packaging
- Source-to-install reproduction: required by release packaging

## Limitation

No live Foundry client was launched in the build environment.
