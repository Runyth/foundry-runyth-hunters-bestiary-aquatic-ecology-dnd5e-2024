# Performance Audit — Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.3.2

## Scope

The complete production source, dashboard lifecycle, data loading, settings persistence, import/update/delete workflows, provider registration, and packaging paths were reviewed for browser responsiveness and Foundry VTT v13 behavior.

## Applied improvements

- Waited for the three independent module dependencies concurrently after validating them.
- Cached stat-block data and shared concurrent in-flight requests.
- Loaded dashboard stat blocks and ecology species concurrently and preindexed linked Actors and catalogue records.
- Provisioned Actors and harvest Items with bounded concurrency and one-pass managed-resource indexes.
- Deleted independent resources with bounded concurrency while preserving complete per-document failure reporting.
- Reduced progress-report allocations, suppressed intermediate renders, and made geometry/tab persistence non-blocking.
- Reused already rendered dashboards rather than forcing unnecessary full renders.

## Deliberately serialized work

Asynchronous concurrency is bounded rather than unlimited. Operations that mutate one shared user record, require atomic provider/world-state replacement, or need precise per-document fallback diagnostics remain serialized. This prevents lost updates, request floods, and non-deterministic partial state while unrelated work proceeds concurrently.

## Browser and Foundry considerations

- Long independent batches use bounded concurrency rather than unbounded `Promise.all`.
- Fallback loops yield periodically so painting and input are not starved.
- Foundry bulk document methods and `render: false` are used where preserving per-document diagnostics allows it.
- Search and progress DOM writes are coalesced instead of triggering repeated synchronous layout work.
- Cached data loaders use a shared in-flight promise and normal browser caching.
- Window-state writes are coalesced and do not delay close animations.

## Regression coverage

- Automated tests: **54/54**
- English/German key parity: **654/654**
- New coverage includes concurrency limits, result ordering, shared-fetch deduplication, settings-write races, same-user mutation serialization, batch imports, and parallel dependency readiness where applicable.
