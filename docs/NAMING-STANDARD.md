# Hunter's Bestiary Naming Standard

Standard version: 1.0.0. The core module's document is authoritative. This copy records how this module applies the same versioned standard so the source archive remains understandable by itself.

## Canonical patterns

```text
Hunter's Bestiary
Hunter's Bestiary - <Game System>
Hunter's Bestiary: <Complementary Subject>
Hunter's Bestiary: <Complementary Subject> - <Game System>
```

Punctuation is normative:

- The family name is exactly `Hunter's Bestiary`, using the ASCII apostrophe.
- A subject is introduced by `: `.
- A game-system designation is introduced by ` - `.
- Subject comes before game system when both are present.
- The official system designation in this family is exactly `D&D 5e 2024`.

### Valid examples

```text
Hunter's Bestiary
Hunter's Bestiary - D&D 5e 2024
Hunter's Bestiary: Aquatic Ecology
Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024
Hunter's Bestiary: Forest Ecology
Hunter's Bestiary: Forest Ecology - Pathfinder Second Edition
```

### Invalid examples

```text
Hunters Bestiary Aquatic Ecology
Hunter Bestiary: Aquatic Ecology
Hunter's Bestiary D&D5e Aquatic
Aquatic Ecology for Hunter's Bestiary
Hunter's Bestiary - Aquatic Ecology
Hunter's Bestiary: D&D 5e 2024 - Aquatic Ecology
```

## Display titles and technical IDs

A display title is user-facing and must follow the canonical pattern. A technical module ID is persistent world identity and must remain stable after release. Do not rename an installed module ID to fix punctuation. Existing settings, flags, managed Documents, dependencies, and world data use the technical ID.

Release archives use:

```text
<module-id>-v<version>.zip
<module-id>-source-v<version>.zip
```

## Runtime registration and warnings

A complementary module registers after the core API is ready. The registration supplies enough metadata for the core to derive the expected title; validation is not based on a loose regular expression alone.

```javascript
const core = game.modules.get("hunters-bestiary")?.api;
await core.whenReady();

const metadata = {
  moduleId: "hunters-bestiary-aquatic-ecology-dnd5e-2024",
  currentTitle: game.modules.get("hunters-bestiary-aquatic-ecology-dnd5e-2024")?.title,
  subject: "Aquatic Ecology",
  gameSystem: "D&D 5e 2024",
  type: "subject-system-layer",
  dashboardApplicationId: "hbae-dnd-dashboard",
  providerId: "hunters-bestiary-aquatic-ecology-dnd5e-2024",
  version: game.modules.get("hunters-bestiary-aquatic-ecology-dnd5e-2024")?.version,
  apiCompatibilityVersion: "1.0.0"
};

const registration = core.registerComplementaryModule(metadata);
const validation = core.validateComplementaryModuleName(metadata);
```

A validation result is structured:

```javascript
{
  valid: false,
  actualName: "Aquatic Monsters for 5e",
  expectedName: "Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024",
  moduleId: "example-aquatic-module",
  metadata: { /* normalized metadata */ },
  problems: [
    { code: "INVALID_FAMILY_PREFIX", message: "..." },
    { code: "TITLE_MISMATCH", message: "..." }
  ]
}
```

The core issues at most one startup notification per offending, enabled module per page load. A complementary dashboard calls `core.ui.validateDashboardModuleName(metadata)` once from its intentional `open()` entry point, so each dashboard opening issues one warning while internal rerenders issue none. Disabled modules are ignored at startup. A warning never rewrites a third-party manifest and never disables an otherwise functional module. The same structured validation is written to the console warning.

## This module

```json
{
  "moduleId": "hunters-bestiary-aquatic-ecology-dnd5e-2024",
  "currentTitle": "Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024",
  "subject": "Aquatic Ecology",
  "gameSystem": "D&D 5e 2024",
  "type": "subject-system-layer",
  "dashboardApplicationId": "hbae-dnd-dashboard",
  "providerId": "hunters-bestiary-aquatic-ecology-dnd5e-2024",
  "version": "1.2.0",
  "apiCompatibilityVersion": "1.0.0"
}
```

Expected title: `Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024`. Stable technical ID: `hunters-bestiary-aquatic-ecology-dnd5e-2024`.
