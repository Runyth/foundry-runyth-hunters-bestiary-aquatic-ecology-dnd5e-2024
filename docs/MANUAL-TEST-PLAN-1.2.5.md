# Manual Runtime Acceptance — 1.2.5

Use Foundry VTT 13.351 and D&D 5e 5.3.3.

1. Enable Hunter's Bestiary 1.3.6, its D&D integration 1.1.7, Aquatic Ecology 1.1.5, and this module 1.2.5.
2. Reload and confirm no base-registry rejection warning.
3. Confirm the provider exposes all twelve stat blocks through the base D&D API.
4. Delete imported aquatic data.
5. Import or update all 36 harvest Items, import all 12 Actors, update the Actors, and generate/update all eight research books.
6. Repeat operations and confirm no duplicates.
7. Confirm no deprecated `senses.darkvision`, `senses.blindsight`, `senses.tremorsense`, or `senses.truesight` warnings.
8. Confirm successful progress windows close automatically.
9. Force one per-document failure and confirm the progress window stays foregrounded with useful details.
