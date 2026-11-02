# D&D Mechanical Validation Report

| Species | CR | XP | AC | HP | Swim | Actions | Harvest Items |
|---|---:|---:|---:|---:|---:|---:|---:|
| Brineback Raker | 7 | 2900 | 15 | 136 | 50 ft. | 2 | 3 |
| Siltbell Colony | 2 | 450 | 13 | 60 | 0 ft. | 2 | 3 |
| Mudcrown Burrower | 6 | 2300 | 17 | 114 | 30 ft. | 3 | 3 |
| Tideglass Keeper | 1 | 200 | 16 | 33 | 10 ft. | 2 | 3 |
| Pilingshell Scavenger | 1 | 200 | 15 | 36 | 25 ft. | 2 | 3 |
| Needlelung Lamprey | 0.5 | 100 | 13 | 18 | 30 ft. | 2 | 3 |
| Glassfin Pike | 2 | 450 | 14 | 52 | 60 ft. | 2 | 3 |
| Reedjaw Ambusher | 4 | 1100 | 16 | 95 | 40 ft. | 2 | 3 |
| Wreckcoil Eel | 3 | 700 | 14 | 72 | 50 ft. | 2 | 3 |
| Greywake Sifter | 8 | 3900 | 14 | 172 | 60 ft. | 2 | 3 |
| Coldwake Thresher | 11 | 7200 | 16 | 210 | 80 ft. | 3 | 3 |
| Trenchjaw Cetarch | 15 | 13000 | 17 | 310 | 70 ft. | 3 | 3 |

CR spans 1/2 to 15 and is absolute rather than party-relative. Large filterers are durable without arbitrary magical offense. The parasite is low CR. Estuarine and harbor species occupy low-to-moderate CR. The two offshore predators are high CR because of damage, durability, underwater mobility, control, and scale—not merely size. No bundled creature has Legendary Actions, Legendary Resistance, regeneration, magical attacks, or an electrical attack.

All Actors use `npc`, hostile unlinked prototype Tokens, `system.details.source.rules = "2024"`, D&D 5.3 Activities, provider provenance, and encounter profiles. The sessile Siltbell Colony is explicitly validated as a zero-speed aquatic exception. Air-breathing creatures have Hold Breath logic; amphibious creatures have both walk and swim movement.


## Import and deletion mechanics — 1.1.0

- Actor import selects existing Actors only when `managed`, `providerId`, `managedKey`, and `monsterId` all identify this module.
- Harvest import selects world Items only when the same exact provider flags and a `harvestId` are present.
- Deletion uses the same positive provenance predicates. It does not match names, folder names, document types alone, or broad Runyth Hunter's Bestiary flags.
- A folder is eligible only when this module created it with an exact `actor-import-folder` or `item-import-folder` marker, and it is empty at deletion time.
- Existing folders reused by import are intentionally left unmarked and therefore cannot be deleted by this module.
- Deleting an imported Actor deletes that Actor as a complete Foundry Document, including any embedded custom additions. This is disclosed in the confirmation and manual test plan. Update/import refresh remains non-destructive to unrelated embedded content.

## Actor size import mechanics — 1.1.1

All twelve descriptive ecology sizes are converted to D&D 5e 5.3.3 native keys before Actor creation. The resulting prototype tokens carry explicit matching dimensions. Automated import simulations cover both a clean world and the reported state containing only the first two managed Actors.
