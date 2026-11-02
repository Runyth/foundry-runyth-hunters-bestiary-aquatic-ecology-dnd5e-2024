# Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.3.4

This patch fixes a Foundry VTT v13 startup-order race. The system layer no longer treats a dependency whose public API is exposed slightly later during world readiness as a permanent failure. Active dependencies are given a bounded API-exposure grace period, and their normal `whenReady()` promises are then awaited concurrently before registration and data initialization continue.

Permanent dependency failures remain fatal and are reported normally. No world-data migration is required.
