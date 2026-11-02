# Complementary Module Authoring Guide

This focused guide explains this module's reference implementation and links conceptually to the authoritative guide in the core source archive.

## Canonical patterns

```text
Runyth Hunter's Bestiary
Runyth Hunter's Bestiary - <Game System>
Runyth Hunter's Bestiary: <Complementary Subject>
Runyth Hunter's Bestiary: <Complementary Subject> - <Game System>
```

Punctuation is normative:

- The family name is exactly `Runyth Hunter's Bestiary`, using the ASCII apostrophe.
- A subject is introduced by `: `.
- A game-system designation is introduced by ` - `.
- Subject comes before game system when both are present.
- The official system designation in this family is exactly `D&D 5e 2024`.

### Valid examples

```text
Runyth Hunter's Bestiary
Runyth Hunter's Bestiary - D&D 5e 2024
Runyth Hunter's Bestiary: Aquatic Ecology
Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024
Runyth Hunter's Bestiary: Forest Ecology
Runyth Hunter's Bestiary: Forest Ecology - Pathfinder Second Edition
```

### Invalid examples

```text
Hunters Bestiary Aquatic Ecology
Hunter Bestiary: Aquatic Ecology
Runyth Hunter's Bestiary D&D5e Aquatic
Aquatic Ecology for Runyth Hunter's Bestiary
Runyth Hunter's Bestiary - Aquatic Ecology
Runyth Hunter's Bestiary: D&D 5e 2024 - Aquatic Ecology
```

## Complementary-module categories

| Type | Purpose | Required metadata | Typical dependencies |
|---|---|---|---|
| `system-layer` | Game-system implementation of the core | `gameSystem`, dashboard ID, provider ID | Core plus game system |
| `subject` | System-neutral thematic/ecological expansion | `subject`, dashboard ID, provider ID | Core |
| `subject-system-layer` | Game-system implementation of a subject expansion | `subject`, `gameSystem`, dashboard ID, provider ID | Core, core system layer, subject expansion, game system |
| `provider` | Additional compatible provider or content pack | Provider ID; subject/system when represented in its title | The API owner whose data it extends |

A provider with its own user-facing dashboard should use one of the first three explicit types. `provider` is intended for compatible content packs that do not represent a complete subject/system layer.

## Initialization, registration, and rollback

1. Expose the module's own API during `init` so callers can obtain `whenReady()` even when later initialization fails.
2. Register settings and narrow integrations idempotently.
3. During `ready`, verify required module/system versions and await every required `whenReady()` promise.
4. Negotiate naming/dashboard compatibility before provider content registration.
5. Register naming metadata with the core.
6. Validate local content before registering it.
7. Register provider, content, or system-layer records atomically where the owning API supports atomic registration.
8. Resolve the module's `whenReady()` status in `finally`, including failures rather than leaving callers pending.

When registration spans APIs, unregister earlier layers if a later layer fails. The aquatic D&D reference implementation rolls back its D&D provider and ecology provider registrations when atomic combined registration fails. Partial content acceptance is never implicit: use the owning module's explicit `allowPartial` or accepted-incomplete policy only when supported and intentionally enabled by a GM.

Unregister during a controlled development reload or rollback with `unregisterComplementaryModule(moduleId)` and the corresponding provider unregister method. Normal Foundry package disable/reload does not require a broad global unload hook.

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
  moduleId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024",
  currentTitle: game.modules.get("runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024")?.title,
  subject: "Aquatic Ecology",
  gameSystem: "D&D 5e 2024",
  type: "subject-system-layer",
  dashboardApplicationId: "hbae-dnd-dashboard",
  providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024",
  version: game.modules.get("runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024")?.version,
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
  expectedName: "Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024",
  moduleId: "example-aquatic-module",
  metadata: { /* normalized metadata */ },
  problems: [
    { code: "INVALID_FAMILY_PREFIX", message: "..." },
    { code: "TITLE_MISMATCH", message: "..." }
  ]
}
```

The core issues at most one startup notification per offending, enabled module per page load. A complementary dashboard calls `core.ui.validateDashboardModuleName(metadata)` once from its intentional `open()` entry point, so each dashboard opening issues one warning while internal rerenders issue none. Disabled modules are ignored at startup. A warning never rewrites a third-party manifest and never disables an otherwise functional module. The same structured validation is written to the console warning.

## Core naming API

| Method | Purpose |
|---|---|
| `getNamingConvention()` | Return the canonical family name, patterns, separators, and naming API version. |
| `getCanonicalModuleName(metadata)` | Derive the exact display title from structured metadata. |
| `validateComplementaryModuleName(metadataOrId, actualName?)` | Return structured title validation. |
| `validateComplementaryModuleRegistration(metadata, declaration)` | Validate naming plus declared dashboard/API/localization/settings constraints. |
| `registerComplementaryModule(metadata)` | Store a normalized registration and emit the registration hook. |
| `unregisterComplementaryModule(moduleId)` | Remove a registration and reset startup-warning state. |
| `getRegisteredComplementaryModules()` | Return cloned registration records. |
| `warnForInvalidComplementaryModuleName(metadataOrId, options)` | Produce Foundry and console warnings without rewriting a manifest. |
| `warnForEnabledComplementaryModuleNames()` | Check all registered modules at startup. |

Naming API version: `1.0.0`.

## Shared dashboard API

The toolkit is available as `game.modules.get("hunters-bestiary").api.ui`.

| Method | Purpose |
|---|---|
| `createDashboardOptions(options)` | Produce consistent ApplicationV2 window options. |
| `clampGeometry(value, defaults, viewport)` | Clamp saved dimensions and coordinates to the current viewport. |
| `loadGeometry(options)` | Load client-scoped geometry. |
| `saveGeometry(options)` | Save clamped client-scoped geometry. |
| `resetSize(options)` | Restore only default width/height while preserving position. |
| `resetPosition(options)` | Restore only position while preserving size. |
| `createGeometryPersistence(app, options)` | Debounce and flush final geometry with a safe lifecycle. |
| `bindStableSearch(root, options)` | Filter in place through an AbortController-scoped input listener. |
| `filterEntries(root, options)` | Apply query visibility and empty-state messaging without replacing the input. |
| `runProgressOperation(options)` | Run an operation with phase, processed/total/percentage, success/skipped/failure counts, details, busy-state handling, optional clean-success closure, and foreground failure retention. |
| `confirmDestructiveAction(options)` | Show exact eligible and preserved scopes with explicit danger confirmation. |
| `setBusyState(root, busy, options)` | Disable conflicting controls and expose an accessible busy state. |
| `reportOperationResult(options)` | Send localized notifications and structured detail logs. |
| `summarizeOperations(entries)` | Aggregate operation result records. |
| `validateDashboardModuleName(metadata, options)` | Perform one dashboard-open naming check. |

Dashboard API version: `1.0.0`. A module requiring a newer major version must fail gracefully and expose an `INCOMPATIBLE_DASHBOARD_API` diagnostic rather than invoking unavailable helpers.

## Machine-readable registration validation

```javascript
const declaration = {
  localizationPresent: true,
  settingsPresent: true,
  usesInvalidGlobalHooks: false
};

const report = core.validateComplementaryModuleRegistration(metadata, declaration);
if (!report.valid) {
  console.warn("Complementary-module declaration failed", report);
}
```

The runtime validator can reliably check canonical title metadata, supported type, requested API major version, dashboard declaration, provider ID, and developer-supplied declarations for localization/settings/hooks. It cannot prove visual contrast, keyboard usability, deterministic builds, CSS isolation, or complete localization by observing a running package alone; those remain build-time and manual-release checks.

## Shared interaction structure

Use only relevant sections, in this order where applicable:

1. Window identity and canonical module title.
2. Compact integration/status summary.
3. Tabs or primary navigation.
4. Stable search and filters.
5. Main content.
6. Contextual actions.
7. Import/update/synchronization controls.
8. Diagnostics and validation.
9. Visually separated destructive actions.
10. Status/footer feedback.

Structural consistency does not require irrelevant empty panels. Theme colors may vary through CSS custom properties; interaction semantics may not.

## Required behavior

- ApplicationV2 with a resizable, positioned window.
- Client-scoped persisted width, height, left, and top.
- Viewport clamping before restore.
- Final flush on close.
- Configure Settings menus for **Reset size** and **Reset position**.
- Search that preserves focus and caret by hiding/showing existing entries instead of rerendering the input.
- AbortController-scoped listeners to prevent duplicate handlers after rerender.
- Real progress with phase, counts, percentage, final summary, error details, and conflicting actions disabled.
- Valid DialogV2 button definitions.
- GM-only operations enforced both in the UI and public API.
- Destructive operations limited to exact provenance flags; names alone never prove ownership.
- Localized labels, tooltips, focus states, semantic controls, meaningful empty states, and no color-only meaning.

## ApplicationV2 reference pattern

```javascript
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const core = game.modules.get("hunters-bestiary")?.api;
await core.whenReady();

const ui = core.ui;
const MODULE_ID = "example-module";
const GEOMETRY_KEY = "dashboardGeometry";

class ExampleDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = ui.createDashboardOptions({
    id: "example-dashboard",
    classes: ["hb-shared-dashboard", "example-dashboard"],
    title: "Example.Dashboard.Title",
    icon: "fa-solid fa-book",
    width: 960,
    height: 700,
    minWidth: 520,
    minHeight: 380
  });

  #listeners = null;
  #geometry = null;

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.setPosition(ui.loadGeometry({
      moduleId: MODULE_ID,
      settingKey: GEOMETRY_KEY,
      applicationId: this.options.id,
      defaults: this.options.position
    }));
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    this.#geometry ??= ui.createGeometryPersistence(this, {
      moduleId: MODULE_ID,
      settingKey: GEOMETRY_KEY,
      applicationId: this.options.id,
      defaults: this.options.position
    });
    ui.bindStableSearch(this.element, {
      inputSelector: "[data-dashboard-search]",
      entrySelector: "[data-dashboard-entry]",
      emptySelector: "[data-dashboard-empty]",
      signal: this.#listeners.signal
    });
  }

  async _preClose(options) {
    this.#listeners?.abort();
    await this.#geometry?.flush();
    this.#geometry?.destroy();
    return super._preClose(options);
  }
}
```

Register `dashboardGeometry` as `scope: "client"`, `config: false`, `type: Object`. Register separate ApplicationV2 settings menus that call `ui.resetSize(...)` and `ui.resetPosition(...)` with the same options. Never store geometry in a world-scoped setting.

## Progress and destructive operations

```javascript
if (!game.user.isGM) throw new Error(game.i18n.localize("Example.Error.GMOnly"));

const confirmed = await ui.confirmDestructiveAction({
  title: game.i18n.localize("Example.Delete.Title"),
  eligible: exactManagedDocuments.map(document => document.name),
  preserved: [game.i18n.localize("Example.Delete.PreservesUserContent")],
  warning: game.i18n.localize("Example.Delete.Warning"),
  confirmLabel: game.i18n.localize("Example.Delete.Confirm")
});
if (!confirmed) return;

await ui.runProgressOperation({
  title: game.i18n.localize("Example.Import.Title"),
  root: dashboard.element,
  runner: async ({ update }) => {
    for (const [index, record] of records.entries()) {
      try {
        await importRecord(record);
        update({ current: index + 1, total: records.length, success: 1, phase: record.name });
      } catch (error) {
        update({ current: index + 1, total: records.length, failed: 1, error, phase: record.name });
      }
    }
  }
});
```

The importer itself must enforce permissions and provenance. A dashboard button is not a security boundary.

## Structural and theme tokens

Structural rules belong to the core `hb-shared-dashboard` layer: spacing, radius, button height, panel padding, typography, focus outline, status badges, progress layout, busy/disabled states, and danger-zone separation.

Complementary modules override only theme custom properties on their own scoped root class, for example:

```css
.example-dashboard {
  --hb-theme-accent: #5aa7c7;
  --hb-theme-background: #071b24;
  --hb-theme-panel: #0d2b37;
  --hb-theme-highlight: #9bd9e8;
  --hb-theme-warning: #e4b86a;
}
```

Do not add broad `button`, `input`, `.window-content`, or ApplicationV2 selectors outside the module root. Do not depend on jQuery. Icon-only controls need localized accessible labels and tooltips.

## Dashboard and complementary-module compliance checklist

### Naming and manifest

- [ ] Canonical ASCII-apostrophe display title.
- [ ] Stable technical module ID.
- [ ] Correct subject/system order and separators.
- [ ] Exact dependency versions and supported Foundry/system ranges.
- [ ] Naming metadata registered after `core.whenReady()`.
- [ ] Dashboard-open validation called only from the intentional open entry point.

### API and lifecycle

- [ ] Own `whenReady()` always resolves with status, including failure.
- [ ] Required API major versions negotiated.
- [ ] Provider registration validated and rolled back on failure.
- [ ] Compatibility aliases retained and documented.
- [ ] GM-only methods enforce permissions internally.

### Dashboard

- [ ] ApplicationV2, resizable, client geometry, viewport clamp, final close save.
- [ ] Reset size and reset position settings menus.
- [ ] Stable search retains focus/caret and updates empty state.
- [ ] AbortController or equivalent listener cleanup.
- [ ] Shared progress with valid DialogV2 buttons and busy state.
- [ ] Import/update terminology is consistent.
- [ ] Destructive actions are separated, confirmed, provenance-scoped, and reported.
- [ ] Tabs, state changes, and filters avoid unnecessary full rerenders.

### Permissions, secrecy, accessibility

- [ ] Player views exclude GM truth, hidden ecology, provider internals, and destructive actions.
- [ ] Controls are keyboard-operable with visible focus.
- [ ] Semantic labels/tooltips and sufficient contrast.
- [ ] No color-only state communication.
- [ ] English/German localization key parity.

### Engineering and release

- [ ] CSS is rooted under module/shared dashboard classes.
- [ ] No broad global hooks or duplicate listeners.
- [ ] No external images or missing local assets.
- [ ] Existing IDs, flags, settings, and imported Documents migrate without duplication.
- [ ] Automated tests and static validation pass.
- [ ] Repeated builds are byte-identical.
- [ ] Source ZIP reproduces the install ZIP.
- [ ] Live Foundry smoke plan completed or explicitly reported as unavailable.

## Reference application in this package

## 1.2.0 behavior

- Canonical combined subject/system title and registration metadata.
- Core toolkit for geometry, stable search, progress, busy state, naming validation, resets, and destructive confirmation.
- All twelve Actors, native D&D size keys, token dimensions, partial-world recovery, exact provenance deletion, user-content preservation, and compatibility aliases remain.
- The ocean-blue D&D palette remains.

