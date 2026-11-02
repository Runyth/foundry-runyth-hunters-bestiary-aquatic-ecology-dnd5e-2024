// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { CORE_ID, ECOLOGY_ID, MODULE_ID, SETTINGS } from "../constants.mjs";
import { loadStatblockData } from "../data.mjs";
import { validateStatblockPackage } from "../validation.mjs";
import { provisionActors, createHarvestItems, deleteImportedData, isImportedActor, collectImportedData } from "../provision.mjs";
import { getIntegrationStatus } from "../registry.mjs";
import { localizeContent } from "../localization.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const DEFAULT_GEOMETRY = Object.freeze({ width: 980, height: 700, minWidth: 700, minHeight: 500 });
const DEFAULT_POSITION = Object.freeze({ width: DEFAULT_GEOMETRY.width, height: DEFAULT_GEOMETRY.height });
const GEOMETRY_OPTIONS = Object.freeze({ moduleId: MODULE_ID, settingKey: SETTINGS.GEOMETRY, applicationId: "hbae-dnd-dashboard", mapped: false, defaults: DEFAULT_GEOMETRY });

function toolkit() {
  const value = game.modules.get(CORE_ID)?.api?.ui;
  if (!value) throw new Error("Runyth Hunter's Bestiary dashboard API 1.0.0 is unavailable.");
  return value;
}

function requireGm() {
  if (game.user?.isGM) return true;
  ui.notifications.error(game.i18n.localize("HBAEDND.Error.GMOnly"));
  return false;
}

export function progressDialogOptions(title) {
  return {
    window: { title },
    content: '<div class="hbae-dnd-progress"><progress max="1" value="0"></progress><p></p></div>',
    buttons: [{ action: "close", label: game.i18n.localize("HBAEDND.Close"), default: true, callback: () => undefined }]
  };
}

export function operationHasFailures(value) {
  const detector = toolkit().operationHasFailures;
  if (typeof detector !== "function") throw new Error("Runyth Hunter's Bestiary dashboard API 1.1.0 operation-result contract is unavailable.");
  return detector(value);
}

async function runImportOperation(app, titleKey, runner) {
  return toolkit().runProgressOperation({
    title: game.i18n.localize(titleKey),
    root: app.element,
    autoCloseOnSuccess: true,
    foregroundOnFailure: true,
    runner: async update => runner(progress => {
      const operation = String(progress.operation ?? "").toLowerCase();
      const skipped = operation === "skipped" || operation.includes("retained");
      const failed = operation.includes("fail") || Boolean(progress.error);
      update({
        ...progress,
        phase: operation,
        success: progress.success ?? Math.max(0, (progress.current ?? 0) - (skipped ? 1 : 0) - (failed ? 1 : 0)),
        skipped: progress.skipped ?? (skipped ? 1 : 0),
        failed: progress.failed ?? (failed ? 1 : 0),
        errors: progress.errors ?? (progress.error ? [progress.error] : [])
      });
    })
  });
}

async function resetSize() {
  await resetAquaticDndDashboardSize();
}

async function resetPosition() {
  await resetAquaticDndDashboardPosition();
}

export class AquaticDndDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "hbae-dnd-dashboard",
    tag: "section",
    classes: ["hbae-dnd-app", "hb-shared-dashboard"],
    window: { title: "HBAEDND.Title", icon: "fa-solid fa-fish-fins", frame: true, positioned: true, minimizable: true, resizable: true },
    position: DEFAULT_POSITION,
    actions: {
      hbaedndImportActors: this.#importActors,
      hbaedndUpdateActors: this.#updateActors,
      hbaedndImportHarvests: this.#importHarvests,
      hbaedndDeleteImported: this.#deleteImported,
      hbaedndValidate: this.#validate,
      hbaedndResetSize: resetSize,
      hbaedndResetPosition: resetPosition,
      hbaedndChangeImage: this.#changeImage
    }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/dashboard.hbs` } };

  #controller = null;
  #search = null;
  #geometry = null;
  #activeTab = "status";
  #query = "";

  constructor(options = {}) {
    super(options);
    this.#activeTab = options.initialTab ?? game.settings.get(MODULE_ID, SETTINGS.ACTIVE_TAB) ?? "status";
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.setPosition(toolkit().loadGeometry(GEOMETRY_OPTIONS));
  }

  async _prepareContext() {
    const [data, ecology] = await Promise.all([
      loadStatblockData(),
      game.modules.get(ECOLOGY_ID)?.api?.getSpecies?.() ?? Promise.resolve([])
    ]);
    const report = validateStatblockPackage(data, ecology);
    const importedKeys = new Set();
    for (const actor of game.actors?.contents ?? game.actors ?? []) {
      if (isImportedActor(actor)) importedKeys.add(actor.getFlag(MODULE_ID, "managedKey"));
    }
    const imageApi = game.modules.get(CORE_ID)?.api;
    const importedLabel = game.i18n.localize("HBAEDND.Status.Imported");
    const notImportedLabel = game.i18n.localize("HBAEDND.Status.NotImported");
    const records = data.statblocks.map(record => {
      const displayName = localizeContent(record.name);
      const social = localizeContent(record.encounter.social);
      return {
        ...record,
        displayName,
        image: imageApi?.getMonsterImage?.(record.id)?.imagePath ?? record.img ?? "modules/hunters-bestiary-aquatic-ecology/assets/aquatic-ecology.svg",
        actorStatus: importedKeys.has(record.managedKey) ? importedLabel : notImportedLabel,
        movementText: JSON.stringify(record.movement),
        harvestCount: record.harvestItems.length,
        searchText: `${displayName} ${record.cr} ${social}`.toLocaleLowerCase(),
        actions: (record.actions ?? []).map(action => ({ ...action, displayName: localizeContent(action.name) })),
        harvestItems: (record.harvestItems ?? []).map(item => ({ ...item, displayName: localizeContent(item.name) })),
        encounter: {
          ...record.encounter,
          social,
          juveniles: localizeContent(record.encounter.juveniles),
          tideCurrent: localizeContent(record.encounter.tideCurrent),
          likelyObjective: localizeContent(record.encounter.likelyObjective),
          escapeConditions: localizeContent(record.encounter.escapeConditions),
          hazards: localizeContent(record.encounter.hazards ?? []),
          noncombat: localizeContent(record.encounter.noncombat ?? [])
        }
      };
    });
    return {
      isGM: game.user.isGM,
      activeTab: this.#activeTab,
      query: this.#query,
      tabs: [["status", "HBAEDND.Tab.Status"], ["actors", "HBAEDND.Tab.Actors"], ["harvests", "HBAEDND.Tab.Harvests"], ["encounters", "HBAEDND.Tab.Encounters"], ["validation", "HBAEDND.Tab.Validation"]]
        .map(([id, label]) => ({ id, label: game.i18n.localize(label), active: id === this.#activeTab })),
      records,
      integrations: game.user.isGM ? getIntegrationStatus() : [],
      report,
      reportJson: JSON.stringify(report, null, 2),
      systemVersion: game.system.version
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#controller?.abort();
    this.#controller = new AbortController();
    const signal = this.#controller.signal;
    this.#geometry ??= toolkit().createGeometryPersistence(this, GEOMETRY_OPTIONS);
    this.element?.addEventListener("pointerup", () => this.#geometry.schedule(), { signal });
    for (const button of this.element?.querySelectorAll("[data-hbaednd-tab]") ?? []) {
      button.addEventListener("click", () => {
        this.#activeTab = button.dataset.hbaedndTab;
        void game.settings.set(MODULE_ID, SETTINGS.ACTIVE_TAB, this.#activeTab)
          .catch(error => console.error(`${MODULE_ID} | Active-tab persistence failed`, error));
        this.render({ force: true });
      }, { signal });
    }
    this.#search?.destroy();
    this.#search = toolkit().bindStableSearch(this.element, {
      inputSelector: "[data-hbaednd-search]",
      entrySelector: "[data-hbaednd-record]",
      emptySelector: "[data-hbaednd-empty]",
      query: this.#query,
      onQuery: query => { this.#query = query; }
    });
  }

  setPosition(position = {}) {
    const result = super.setPosition(position);
    if (this.rendered) this.#geometry?.schedule();
    return result;
  }

  async _preClose(options) {
    this.#controller?.abort();
    this.#search?.destroy();
    const geometry = this.#geometry;
    this.#geometry = null;
    let persistence;
    try { persistence = geometry?.flush(); } catch (error) { console.error(`${MODULE_ID} | Window-state persistence failed`, error); }
    geometry?.destroy();
    if (persistence) void Promise.resolve(persistence).catch(error => console.error(`${MODULE_ID} | Window-state persistence failed`, error));
    return super._preClose(options);
  }

  static async #changeImage(_event, target) {
    if (!requireGm()) return;
    const monsterId = target.dataset.monsterId;
    if (!monsterId) return;
    return game.modules.get(CORE_ID)?.api?.openMonsterImagePicker?.(monsterId, {
      onSelected: async () => {
        ui.notifications.info(game.i18n.localize("HBAEDND.Notice.ImageUpdated"));
        await this.render({ force: true });
      }
    });
  }

  static async #importActors() {
    if (!requireGm()) return;
    const results = await runImportOperation(this, "HBAEDND.Progress.ImportActors", onProgress => provisionActors({ update: false, onProgress }));
    if (operationHasFailures(results)) return results;
    const imported = results.filter(entry => entry.operation === "imported").length;
    ui.notifications.info(game.i18n.format("HBAEDND.Notice.ActorsImported", { count: imported }));
    this.render({ force: true });
  }

  static async #updateActors() {
    if (!requireGm()) return;
    const results = await runImportOperation(this, "HBAEDND.Progress.UpdateActors", onProgress => provisionActors({ update: true, onProgress }));
    if (operationHasFailures(results)) return results;
    const updated = results.filter(entry => entry.operation === "updated").length;
    ui.notifications.info(game.i18n.format("HBAEDND.Notice.ActorsUpdated", { count: updated }));
    this.render({ force: true });
  }

  static async #importHarvests() {
    if (!requireGm()) return;
    const results = await runImportOperation(this, "HBAEDND.Progress.ImportItems", onProgress => createHarvestItems({ onProgress }));
    if (operationHasFailures(results)) return results;
    ui.notifications.info(game.i18n.format("HBAEDND.Notice.HarvestsImported", { count: results.length }));
    this.render({ force: true });
  }

  static async #deleteImported() {
    if (!requireGm()) return;
    const candidates = collectImportedData({ actors: [...(game.actors ?? [])], items: [...(game.items ?? [])], folders: [...(game.folders ?? [])] });
    const confirmed = await toolkit().confirmDestructiveAction({
      title: game.i18n.localize("HBAEDND.Delete.Title"),
      warning: game.i18n.localize("HBAEDND.Delete.Warning"),
      eligible: [
        game.i18n.format("HBAEDND.Delete.EligibleActors", { count: candidates.actors.length }),
        game.i18n.format("HBAEDND.Delete.EligibleItems", { count: candidates.items.length }),
        game.i18n.format("HBAEDND.Delete.EligibleFolders", { count: candidates.folders.length })
      ],
      preserved: [game.i18n.localize("HBAEDND.Delete.PreserveUnmanaged"), game.i18n.localize("HBAEDND.Delete.PreserveModified")],
      confirmLabel: game.i18n.localize("HBAEDND.Delete.Button"),
      cancelLabel: game.i18n.localize("HBAEDND.Cancel")
    });
    if (!confirmed) return;
    const report = await toolkit().runProgressOperation({
      title: game.i18n.localize("HBAEDND.Delete.Progress"),
      root: this.element,
      autoCloseOnSuccess: true,
      foregroundOnFailure: true,
      runner: async update => deleteImportedData({ onProgress: progress => update({ ...progress, phase: progress.operation }) })
    });
    if (operationHasFailures(report)) return report;
    ui.notifications.info(game.i18n.format("HBAEDND.Notice.Deleted", { actors: report.actorsDeleted, items: report.itemsDeleted, folders: report.foldersDeleted }));
    console.info(`${MODULE_ID} | Delete imported data`, report);
    this.render({ force: true });
  }

  static async #validate() {
    if (!requireGm()) return;
    const data = await loadStatblockData();
    const ecology = await game.modules.get(ECOLOGY_ID)?.api?.getSpecies?.() ?? [];
    const report = validateStatblockPackage(data, ecology);
    ui.notifications[report.valid ? "info" : "error"](game.i18n.format("HBAEDND.Notice.Validation", { issues: report.issues.length }));
    this.render({ force: true });
  }
}

let instance;

async function applyGeometry(operation, key) {
  const value = await operation(GEOMETRY_OPTIONS);
  if (instance?.rendered) instance.setPosition(value);
  ui.notifications.info(game.i18n.localize(key));
  return value;
}

export function resetAquaticDndDashboardSize() { return applyGeometry(toolkit().resetSize, "HBAEDND.Notice.SizeReset"); }
export function resetAquaticDndDashboardPosition() { return applyGeometry(toolkit().resetPosition, "HBAEDND.Notice.PositionReset"); }

const SettingsApplication = globalThis.foundry?.applications?.api?.ApplicationV2 ?? class {};
class ImmediateSettingsAction extends SettingsApplication { static async execute() {} async render() { await this.constructor.execute(); return this; } }
export class OpenDashboardMenu extends ImmediateSettingsAction { static execute() { return openAquaticDndDashboard(); } }
export class ResetDashboardSizeMenu extends ImmediateSettingsAction { static execute() { return resetAquaticDndDashboardSize(); } }
export class ResetDashboardPositionMenu extends ImmediateSettingsAction { static execute() { return resetAquaticDndDashboardPosition(); } }

export async function openAquaticDndDashboard(options = {}) {
  game.modules.get(CORE_ID)?.api?.ui?.validateDashboardModuleName?.({
    moduleId: MODULE_ID,
    currentTitle: game.modules.get(MODULE_ID)?.title,
    subject: "Aquatic Ecology",
    gameSystem: "D&D 5e 2024",
    type: "subject-system-layer",
    dashboardApplicationId: "hbae-dnd-dashboard",
    providerId: MODULE_ID,
    version: game.modules.get(MODULE_ID)?.version,
    apiCompatibilityVersion: "1.0.0"
  });
  if (instance?.rendered && !options.initialTab) {
    instance.bringToFront?.();
    return instance;
  }
  instance ??= new AquaticDndDashboard(options);
  if (options.initialTab && !instance.rendered) instance = new AquaticDndDashboard(options);
  await instance.render({ force: true });
  if (instance?.rendered && instance.element) instance.bringToFront?.();
  return instance;
}
