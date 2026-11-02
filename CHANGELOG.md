## 1.3.5 — 2026-08-24

- Hardened stat-block package validation so null, primitive, malformed ecology, stat-block, trait, action, and harvest entries produce structured validation issues instead of throwing.
- Fixed the cross-module malformed species input at its source by requiring Runyth Hunter's Bestiary: Aquatic Ecology 1.2.4, which now preserves a stable `{ id }` record when core knowledge filtering hides a species.
- Added regression coverage for all 12 packaged stat blocks, null ecology entries, null stat-block entries, and full Foundry-ready startup with the 12-record provider.
- No world-data migration is required.

## 1.3.4 — 2026-08-12

- Fixed a Foundry VTT v13 readiness-order race that could permanently fail the D&D 5e aquatic layer before an active dependency exposed or completed its public readiness API.
- Active dependencies now receive a short bounded API-exposure grace period, then all dependency `whenReady()` promises are awaited concurrently.
- Genuine inactive dependencies and dependencies that complete with startup failures are still rejected with explicit diagnostics.
- Added late-API, asynchronous-readiness, concurrent-wait, and genuine-failure regression coverage.
- No world-data migration is required.

## 1.3.3 — 2026-08-03

- Fixed Foundry VTT v13 startup failure `Cannot add property _startupFailures, object is not extensible`.
- Moved transient initialization failures out of the frozen public API into private module-scoped state.
- Preserved settings retry, dependency readiness, registry diagnostics, and final status reporting.
- Raised the Aquatic Ecology dependency floor to 1.2.3 and added regression coverage preventing future writes to frozen API objects.

## 1.3.2 — 2026-08-03

- Waited for the three independent module dependencies concurrently after validating them.
- Cached stat-block data and shared concurrent in-flight requests.
- Loaded dashboard stat blocks and ecology species concurrently and preindexed linked Actors and catalogue records.
- Provisioned Actors and harvest Items with bounded concurrency and one-pass managed-resource indexes.
- Deleted independent resources with bounded concurrency while preserving complete per-document failure reporting.
- Reduced progress-report allocations, suppressed intermediate renders, and made geometry/tab persistence non-blocking.
- Reused already rendered dashboards rather than forcing unnecessary full renders.

## 1.3.1 — 2026-08-03

- Replaced embedded bilingual content records with standard Foundry localization keys.
- Made Foundry’s global Language Preference the sole language selector.
- Removed custom translation loading/injection and language-specific runtime branches.
- Added future-language authoring documentation and regression coverage.
- Preserved the coordinated actor-image feature set and all stable IDs and settings.

# Changelog

## 1.3.0

- Added clickable aquatic Actor images through the core FilePicker workflow.
- Synchronized dashboard images, Actor portraits, and prototype-token textures.
- Added pre-packed image documentation.

## 1.2.5

- Corrected registration with the base D&D integration by using the documented registry signature and converting aquatic records to the complete base compatibility shape.
- Verifies all twelve registered stat blocks, supports asynchronous dependency readiness, idempotent replacement, stale-record removal, and rollback diagnostics.
- Generated Actor senses now use only `system.attributes.senses.ranges.*`.
- Removed copied unrestricted result traversal and delegated progress failure detection to the shared safe contract.
- Preserved local import fallback with structured provider, record, rule, rollback, and availability diagnostics for genuine future failures.

## 1.2.4

- Closed Aquatic D&D progress windows automatically after completely successful imports, updates, Item operations, and deletion.
- Kept progress windows open and foregrounded whenever an operation throws or any individual document fails.
- Added cumulative failure details and continued processing so the progress window lists all failed Actors, Items, or folders instead of only the first error.
- Prevented success notifications and dashboard rerenders from obscuring a retained failure window.
- Raised the Runyth Hunter's Bestiary dependency floor to 1.3.5 for the enhanced progress lifecycle.


## 1.2.3

- Fixed the root localization failure that displayed every dashboard label as an internal `HBAEDND.*` key.
- Expanded flat language-file keys into Foundry's nested translation dictionary before installation.
- Removed localization prefix collisions such as `HBAEDND.Actions` versus `HBAEDND.Actions.Label`.
- Added complete dashboard-reference resolution tests for both English and German.
- Made the defensive translation loader retryable after transient failures.
- Required translations to be ready before context preparation and dashboard rendering.
- Raised the Runyth Hunter's Bestiary dependency floor to 1.3.4.

## 1.2.2

- Restored the complete Configure Settings category through idempotent, verifiable setting and menu registration.
- Removed the eager dashboard import from settings registration and replaced it with lazy menu actions.
- Fixed the dashboard foreground-focus race by waiting for ApplicationV2 rendering.
- Coordinated dependency floors with the current core, core D&D, and Aquatic Ecology patches.

## 1.2.1 - 2026-07-31

- Fixed both Configure Settings dashboard launchers on Foundry v13 by removing unsupported minimum-size fields from ApplicationV2 position defaults.
- Retained minimum dashboard geometry through the shared geometry configuration and viewport clamping.
- Replaced raw localization identifiers in module settings with resolved English or German names, labels, and descriptions.
- Added defensive localized fallbacks for permission and geometry-reset notifications.
- Added a guarded runtime translation-dictionary recovery path when Foundry has not loaded the module language file.
- Removed a duplicated geometry-persistence initialization statement.
- Updated dependencies to Runyth Hunter's Bestiary - D&D 5e 2024 1.1.2 and Aquatic Ecology 1.1.1.
- Added regression tests for valid ApplicationV2 options and human-readable settings text.

## 1.2.0 - 2026-07-31

- Normalized the canonical family title and coordinated dependency versions across all four official modules.
- Added/consumed the core naming API with structured validation, registrations, startup warning deduplication, and dashboard-open warnings.
- Added/consumed the shared dashboard toolkit for ApplicationV2 geometry, reset controls, stable search, progress, busy states, operation reporting, and safe destructive confirmations.
- Preserved stable module IDs, existing settings and flags, imported content identities, provider IDs, and documented compatibility aliases.
- Added complete English/German localization parity, developer guidance, migration documentation, tests, and release qualification artifacts.
- Retained this module's ocean-blue d&d integration palette and module-specific functionality.


## 1.1.1 — 2026-07-31

- Fixed `Import missing Actors` stopping after two creatures under D&D 5e 5.3.3.
- Converted ecology size names (`small`, `medium`, `large`, `gargantuan`) to the native D&D keys (`sm`, `med`, `lg`, `grg`) while retaining `tiny` and `huge`.
- Added explicit prototype-token width and height values for every native size key.
- Added clean-world regression coverage proving all twelve Actors import successfully.
- Added partial-world regression coverage proving the two existing Actors are preserved and the remaining ten import without duplication.

## 1.1.0 — 2026-07-31

- Replaced Create/Provision terminology with Import terminology throughout the dashboard, localization, API aliases, and documentation.
- Fixed the Foundry v13 `DialogV2` crash by giving the progress dialog a valid button configuration.
- Added a confirmed **Delete all imported data** workflow scoped to exact module provenance flags.
- Added safe cleanup of empty folders created by this module while preserving pre-existing and non-empty folders.
- Added `importActors`, `importHarvestItems`, and `deleteImportedData` public API methods while preserving old compatibility aliases.
- Added base-registry compatibility records and isolated base-registry rejection so local import cannot be disabled by an external schema mismatch.
- Made the dashboard resizable, preserved final geometry on close, and changed search filtering to update in place without focus loss.

## 1.0.0 — 2026-07-30

- Initial D&D 5e 2024 implementation for all twelve Aquatic Ecology species, with Actor/Item provisioning, managed refresh, encounter profiles, native check mapping, strict validation, atomic registration, English/German localization, and deterministic packaging.
