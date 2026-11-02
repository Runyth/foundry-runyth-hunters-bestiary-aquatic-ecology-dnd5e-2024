# Data Schema

`schemas/statblocks.schema.json` documents structural requirements. `scripts/validation.mjs` adds semantic checks for ecology matches, movement, respiration, 2024 marker, varied encounter data, harvest metadata, and stable IDs. `scripts/builder.mjs` converts validated records into D&D 5.3 Actor and Item source objects.