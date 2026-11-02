# Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.3.2

Patch release focused on responsiveness, reduced document and DOM work, safe asynchronous concurrency, and Foundry-specific batching. No gameplay rules, stable IDs, localization keys, public APIs, or user data formats were intentionally changed.

## Changes

- Waited for the three independent module dependencies concurrently after validating them.
- Cached stat-block data and shared concurrent in-flight requests.
- Loaded dashboard stat blocks and ecology species concurrently and preindexed linked Actors and catalogue records.
- Provisioned Actors and harvest Items with bounded concurrency and one-pass managed-resource indexes.
- Deleted independent resources with bounded concurrency while preserving complete per-document failure reporting.
- Reduced progress-report allocations, suppressed intermediate renders, and made geometry/tab persistence non-blocking.
- Reused already rendered dashboards rather than forcing unnecessary full renders.

## Compatibility

Install Runyth Hunter's Bestiary 1.4.2, the D&D integration 1.2.2, and Aquatic Ecology 1.2.2 first. Existing Actors, Items, folders, registry entries, and research content remain valid.
