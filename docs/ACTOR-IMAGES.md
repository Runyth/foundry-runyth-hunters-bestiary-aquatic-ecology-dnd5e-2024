# Aquatic D&D Actor images

The effective image is owned by Hunter’s Bestiary core and shared across the Aquatic Ecology dashboard, this D&D dashboard, imported Actor portrait, and prototype-token texture.

## Pre-packed source workflow

The authoritative packaged path is the `img` field on each species in the Aquatic Ecology module’s `data/ecology.json`. The D&D stat-block package mirrors that path for standalone source inspection.

1. Add `<species-id>.webp` below `hunters-bestiary-aquatic-ecology/assets/actors/`.
2. Change the matching ecology species `img` field.
3. Mirror the path in this module’s `data/statblocks.json`.
4. Build Aquatic Ecology before this D&D integration.

## Installed world workflow

A GM can click an Actor image on the Actors tab. Foundry’s standard FilePicker opens, including upload controls where permitted. The selected path is persisted as a core world override and immediately synchronized to an already imported Actor and its prototype token. Future Actor updates retain the override.
