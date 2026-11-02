# Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.2.0 Release Notes

Released 2026-07-31. Feature release from 1.1.1 to 1.2.0.

## 1.2.0 behavior

- Canonical combined subject/system title and registration metadata.
- Core toolkit for geometry, stable search, progress, busy state, naming validation, resets, and destructive confirmation.
- All twelve Actors, native D&D size keys, token dimensions, partial-world recovery, exact provenance deletion, user-content preservation, and compatibility aliases remain.
- The ocean-blue D&D palette remains.

## Compatibility and preservation

## Migration guarantees

This feature release changes display titles and adds APIs; it does not change the stable module ID. Existing world/client setting keys remain valid. Geometry data is retained where the same keys existed and clamped when restored. Existing managed flags, provider IDs, stable ecology/monster IDs, Actor and Item identities, generated Journal identities, folder ownership, and update-preservation policies remain authoritative.

Only module-owned metadata fields may be normalized. The migration must not rename unrelated user-created Documents, infer ownership from a name, create duplicate imports, or create a second folder merely because its old display name resembles a previous module title. Compatibility aliases remain available for this feature release and are documented as aliases rather than removed.

Before upgrading, back up the world. Replace the entire module directory with the new install archive rather than merging runtime files from two versions.

## Qualification

- Automated tests: 29/29 passed.
- Static validator: passed.
- English/German localization parity: passed.
- Deterministic-build and source-reproduction outcomes are recorded in the final generated qualification report.
- Live Foundry client testing: unavailable in the build environment; execute `docs/MANUAL-TEST-PLAN.md`.
