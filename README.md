# Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024

Current release: **1.3.5**.

## Required versions

1. Hunter's Bestiary 1.4.2+
2. Hunter's Bestiary - D&D 5e 2024 1.2.2+
3. Hunter's Bestiary: Aquatic Ecology 1.2.4+
4. This module 1.3.5
5. D&D Fifth Edition 5.3.3

## 1.3.0 actor-image feature

- The Actors dashboard displays each species' effective shared image.
- A GM can click an Actor picture to open Foundry's standard image FilePicker.
- New and updated aquatic Actors use that image for both `img` and `prototypeToken.texture.src`.
- Existing world overrides are preserved across imports and updates.
- The Aquatic Ecology and Aquatic D&D dashboards therefore remain visually synchronized.

Existing import, update, delete, registry, failure-retention, and progress-window behavior remains unchanged.

Replace the complete module directory while Foundry is stopped, restart Foundry, and enable the dependencies in the order shown above.

See [`docs/ACTOR-IMAGES.md`](docs/ACTOR-IMAGES.md) for source packaging and installed-world image selection.
## Localization

This module uses Foundry VTT’s standard global localization system. Select the active language through Foundry’s **Language Preference** setting; there is no dashboard-specific selector. English is the fallback/default language. See [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md) to add another language.

