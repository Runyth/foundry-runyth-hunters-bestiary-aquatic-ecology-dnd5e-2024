# Build Report — Hunter’s Bestiary: Aquatic Ecology - D&D 5e 2024 1.3.0

## Feature scope

- Packaged monster/species image declarations.
- One effective image shared across relevant dashboards.
- Actor portrait and prototype-token texture synchronization.
- GM image replacement through the core Foundry FilePicker workflow.
- World-level overrides separated from provider/source content.
- Source-author documentation for pre-packed custom images.

## Automated qualification

- Automated tests: **53/53 passed**.
- Localization parity: **88/88**.
- Static manifest, path, import, CSS-isolation, action, and deprecated-API checks: passed.
- Runtime target: Foundry VTT 13.351; D&D 5e 5.3.3.

## Packaging contract

- Install ZIP has one non-versioned module root.
- Source ZIP contains complete editable source, tests, documentation, and deterministic packaging tools.
- ZIP timestamps and file ordering are deterministic.
- A second independent build and extracted-source reproduction are required before publication.

## Runtime limitation

A live Foundry VTT client is not available in the build environment. Complete the versioned manual test plan in the intended world.
