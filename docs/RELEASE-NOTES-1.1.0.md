# Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.1.0

This feature release fixes the Actor import crash, adopts Import terminology, and adds safe removal of all module-imported world data.

The supplied runtime log showed two module-owned failures: the progress `DialogV2` was constructed with an empty `buttons` array, and the base D&D registry rejected the aquatic provider records. Version 1.1.0 supplies a valid progress-dialog button, emits compatibility records for the base registry, and keeps local import available if a future base registry schema rejects those records.

Deletion is opt-in, GM-only, confirmed, and provenance-scoped. It removes only exact module-managed Actors, exact module-managed world harvest Items, and empty folders created by this module.
