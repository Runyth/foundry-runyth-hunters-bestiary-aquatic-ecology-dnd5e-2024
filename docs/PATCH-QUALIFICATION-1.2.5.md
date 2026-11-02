# Patch Qualification 1.2.5

Aquatic D&D 1.2.5 must register all twelve supported records through the base D&D registry without fallback, generate only modern D&D sense-range data, and never recursively enumerate returned Foundry Documents. Genuine invalid providers must remain rejected with structured diagnostics and local import fallback.

## Required gates

- All twelve compatibility records accepted and retrievable.
- Idempotent registration and stale-record replacement.
- Asynchronous readiness and atomic rollback coverage.
- Throwing/deprecated getters remain unaccessed.
- Modern `system.attributes.senses.ranges.*` data only.
- Import, update, deletion, and research progress policies preserved.
- Deterministic packaging and source reproduction.
