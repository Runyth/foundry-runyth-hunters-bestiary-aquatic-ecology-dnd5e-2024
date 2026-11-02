// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, SETTINGS } from "./constants.mjs";

function settingKey(key) {
  return `${MODULE_ID}.${key}`;
}

function settingExists(key) {
  return Boolean(game.settings?.settings?.has?.(settingKey(key)));
}

function menuExists(key) {
  return Boolean(game.settings?.menus?.has?.(settingKey(key)));
}

function createImmediateMenu(execute) {
  const Base = foundry.applications.api.ApplicationV2;
  return class ImmediateSettingsAction extends Base {
    static async execute() { return execute(); }
    async render() { await this.constructor.execute(); return this; }
  };
}

async function dashboardAction(action) {
  const dashboard = await import("./apps/dashboard.mjs");
  return dashboard[action]();
}

export function expectedSettingsKeys() {
  return [
    SETTINGS.ACTOR_FOLDER,
    SETTINGS.ITEM_FOLDER,
    SETTINGS.GEOMETRY,
    SETTINGS.ACTIVE_TAB,
    "dashboard",
    "resetDashboardSize",
    "resetDashboardPosition"
  ];
}

export function registerSettings() {
  if (!settingExists(SETTINGS.ACTOR_FOLDER)) game.settings.register(MODULE_ID, SETTINGS.ACTOR_FOLDER, {
    name: "HBAEDND.Settings.ActorFolder.Name",
    hint: "HBAEDND.Settings.ActorFolder.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024: Actors",
    restricted: true
  });
  if (!settingExists(SETTINGS.ITEM_FOLDER)) game.settings.register(MODULE_ID, SETTINGS.ITEM_FOLDER, {
    name: "HBAEDND.Settings.ItemFolder.Name",
    hint: "HBAEDND.Settings.ItemFolder.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024: Harvest Items",
    restricted: true
  });
  if (!settingExists(SETTINGS.GEOMETRY)) game.settings.register(MODULE_ID, SETTINGS.GEOMETRY, { scope: "client", config: false, type: Object, default: {} });
  if (!settingExists(SETTINGS.ACTIVE_TAB)) game.settings.register(MODULE_ID, SETTINGS.ACTIVE_TAB, { scope: "client", config: false, type: String, default: "status" });

  if (!menuExists("dashboard")) game.settings.registerMenu(MODULE_ID, "dashboard", {
    name: "HBAEDND.Settings.Dashboard.Name",
    label: "HBAEDND.Settings.Dashboard.Label",
    hint: "HBAEDND.Settings.Dashboard.Hint",
    icon: "fa-solid fa-fish-fins",
    type: createImmediateMenu(() => dashboardAction("openAquaticDndDashboard")),
    restricted: true
  });
  if (!menuExists("resetDashboardSize")) game.settings.registerMenu(MODULE_ID, "resetDashboardSize", {
    name: "HBAEDND.Settings.ResetSize.Name",
    label: "HBAEDND.Settings.ResetSize.Label",
    hint: "HBAEDND.Settings.ResetSize.Hint",
    icon: "fa-solid fa-expand",
    type: createImmediateMenu(() => dashboardAction("resetAquaticDndDashboardSize")),
    restricted: false
  });
  if (!menuExists("resetDashboardPosition")) game.settings.registerMenu(MODULE_ID, "resetDashboardPosition", {
    name: "HBAEDND.Settings.ResetPosition.Name",
    label: "HBAEDND.Settings.ResetPosition.Label",
    hint: "HBAEDND.Settings.ResetPosition.Hint",
    icon: "fa-solid fa-crosshairs",
    type: createImmediateMenu(() => dashboardAction("resetAquaticDndDashboardPosition")),
    restricted: false
  });
  return verifySettingsRegistration();
}

export function verifySettingsRegistration() {
  const missing = expectedSettingsKeys().filter(key => {
    const isMenu = ["dashboard", "resetDashboardSize", "resetDashboardPosition"].includes(key);
    return isMenu ? !menuExists(key) : !settingExists(key);
  });
  return { valid: missing.length === 0, missing };
}
