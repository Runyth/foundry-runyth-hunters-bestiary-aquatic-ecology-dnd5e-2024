// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, CORE_ID, BASE_DND_ID, ECOLOGY_ID } from "./constants.mjs";
import { loadStatblockData } from "./data.mjs";
import { validateStatblockPackage } from "./validation.mjs";
import { registerBundledStatblocks, getIntegrationStatus } from "./registry.mjs";
import { createApi, markReady } from "./api.mjs";
import { openAquaticDndDashboard } from "./apps/dashboard.mjs";
import { registerSettings } from "./settings.mjs";
import { waitForDependencies } from "./startup.mjs";

const startupFailures = [];

Hooks.once("init", () => {
  const module = game.modules.get(MODULE_ID);
  module.api = createApi(openAquaticDndDashboard);
  startupFailures.length = 0;
  try {
    const settings = registerSettings();
    if (!settings.valid) throw new Error(`Missing registered settings: ${settings.missing.join(", ")}`);
  } catch (error) {
    startupFailures.push({ stage: "settings", message: error.message });
    console.error(`${MODULE_ID} | Settings failed`, error);
  }
});

Hooks.once("ready", async () => {
  const failures = [...startupFailures];
  try {
    const settings = registerSettings();
    if (!settings.valid) throw new Error(`Missing registered settings after retry: ${settings.missing.join(", ")}`);
  } catch (error) {
    failures.push({ stage: "settings-ready-retry", message: error.message });
    console.error(`${MODULE_ID} | Settings retry failed`, error);
  }
  try {
    if (game.system.id !== "dnd5e" || game.system.version !== "5.3.3") throw new Error(`Requires D&D 5e 5.3.3; active system is ${game.system.id} ${game.system.version}.`);
    await waitForDependencies([CORE_ID, BASE_DND_ID, ECOLOGY_ID]);
    const coreApi = game.modules.get(CORE_ID).api;
    coreApi.registerComplementaryModule({
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
    coreApi.warnForInvalidComplementaryModuleName(MODULE_ID, { reason: "startup" });
    const data = await loadStatblockData();
    const ecology = await game.modules.get(ECOLOGY_ID).api.getSpecies();
    const report = validateStatblockPackage(data, ecology);
    if (!report.valid) throw Object.assign(new Error("Bundled aquatic D&D package is invalid."), { validation: report });
    if (game.user.isGM) await registerBundledStatblocks(data);
    console.info(`${MODULE_ID} | Ready with ${data.statblocks.length} D&D 5e 2024 stat blocks.`);
  } catch (error) { failures.push({ stage: "ready", message: error.message, validation: error.validation }); console.error(`${MODULE_ID} | Startup failure`, error); }
  finally { const status = game.user.isGM ? getIntegrationStatus(MODULE_ID) : null; markReady({ failures, providerRegistered: Boolean(status), baseRegistered: Boolean(status?.baseRegistered), baseIssues: status?.baseIssues ?? [], system: `${game.system.id} ${game.system.version}` }); }
});
