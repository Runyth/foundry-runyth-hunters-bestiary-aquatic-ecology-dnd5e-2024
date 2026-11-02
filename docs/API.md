# Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 API

Release: 1.2.0. Public APIs are exposed through `game.modules.get("runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024").api`; no new global namespace is required. Existing compatibility surfaces are retained for this feature release.

## Shared core dependency

This module awaits `game.modules.get("hunters-bestiary").api.whenReady()` and consumes naming API 1.0.0 and dashboard API 1.1.0. See the core source archive for the authoritative contracts.

## Module-specific public API

After `await api.whenReady()`:

- `importActors({ update })`; compatibility alias `provisionActors` remains.
- `importHarvestItems()`; compatibility alias `createHarvestItems` remains.
- `deleteImportedData(options)` using exact module provenance.
- GM-only `buildActorData(monsterId)`, `buildHarvestItemData(monsterId)`, and `getEncounterProfile(monsterId)`.
- `getIntegrationStatus(providerId)`, `open(options)`, and `getStatus()`.

The module consumes `core.ui`, registers `type: "subject-system-layer"`, subject `Aquatic Ecology`, system `D&D 5e 2024`, and provider ID `runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024`. Its combined ecology/D&D registration supports rollback.

## Initialization, registration, and rollback

1. Expose the module's own API during `init` so callers can obtain `whenReady()` even when later initialization fails.
2. Register settings and narrow integrations idempotently.
3. During `ready`, verify required module/system versions and await every required `whenReady()` promise.
4. Negotiate naming/dashboard compatibility before provider content registration.
5. Register naming metadata with the core.
6. Validate local content before registering it.
7. Register provider, content, or system-layer records atomically where the owning API supports atomic registration.
8. Resolve the module's `whenReady()` status in `finally`, including failures rather than leaving callers pending.

When registration spans APIs, unregister earlier layers if a later layer fails. The aquatic D&D reference implementation rolls back its D&D provider and ecology provider registrations when atomic combined registration fails. Partial content acceptance is never implicit: use the owning module's explicit `allowPartial` or accepted-incomplete policy only when supported and intentionally enabled by a GM.

Unregister during a controlled development reload or rollback with `unregisterComplementaryModule(moduleId)` and the corresponding provider unregister method. Normal Foundry package disable/reload does not require a broad global unload hook.


## Permissions

Dashboard visibility does not grant authority. Every method that creates, updates, deletes, registers privileged provider data, or exposes GM-only truth checks `game.user.isGM` internally and fails with a localized error when unauthorized. Player-safe read APIs return filtered data where supported.

## Base registry integration

Version 1.2.5 waits for the base D&D API, validates compatibility records with `validateStatblocks(records, options)`, registers them with provider replacement, and verifies that all expected monster IDs are retrievable. Genuine failure preserves local import and reports structured provider, record, rule, field, rollback, and availability diagnostics.

Generated Actor senses use only `system.attributes.senses.ranges.*`.
