# Runyth Hunter's Bestiary Dashboard Standard

Dashboard API version: 1.0.0. The core module is authoritative; this module consumes the same public toolkit.

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

## This module's application

- Canonical title: **Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024**
- Theme retained: Ocean-blue D&D integration palette
- Shared infrastructure: geometry load/save/clamp/reset, stable search, progress, busy state, result reporting, destructive confirmation where applicable, and dashboard-open naming validation.

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

