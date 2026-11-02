// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
const settings = await readFile(new URL("../scripts/settings.mjs", import.meta.url), "utf8");
const main = await readFile(new URL("../scripts/main.mjs", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));
const en = JSON.parse(await readFile(new URL("../lang/en.json", import.meta.url), "utf8"));
const de = JSON.parse(await readFile(new URL("../lang/de.json", import.meta.url), "utf8"));

test("Aquatic D&D ApplicationV2 position contains only width and height", () => {
  assert.match(dashboard, /const DEFAULT_POSITION = Object\.freeze\(\{ width: DEFAULT_GEOMETRY\.width, height: DEFAULT_GEOMETRY\.height \}\)/);
  assert.match(dashboard, /position: DEFAULT_POSITION/);
  const position = dashboard.match(/const DEFAULT_POSITION = Object\.freeze\(\{([^}]*)\}\)/)?.[1] ?? "";
  assert.doesNotMatch(position, /minWidth|minHeight/);
  assert.match(dashboard, /DEFAULT_GEOMETRY = Object\.freeze\(\{[^}]*minWidth: 700[^}]*minHeight: 500/);
});

test("module settings use standard Foundry localization keys", () => {
  for (const key of [
    "HBAEDND.Settings.ActorFolder.Name", "HBAEDND.Settings.ActorFolder.Hint",
    "HBAEDND.Settings.ItemFolder.Name", "HBAEDND.Settings.ItemFolder.Hint",
    "HBAEDND.Settings.Dashboard.Name", "HBAEDND.Settings.Dashboard.Label", "HBAEDND.Settings.Dashboard.Hint",
    "HBAEDND.Settings.ResetSize.Name", "HBAEDND.Settings.ResetSize.Label", "HBAEDND.Settings.ResetSize.Hint",
    "HBAEDND.Settings.ResetPosition.Name", "HBAEDND.Settings.ResetPosition.Label", "HBAEDND.Settings.ResetPosition.Hint"
  ]) {
    assert.match(settings, new RegExp(key.replaceAll(".", "\\.")));
    assert.equal(typeof en[key], "string", `English dictionary missing ${key}`);
    assert.equal(typeof de[key], "string", `German dictionary missing ${key}`);
  }
  assert.doesNotMatch(settings, /Übersicht öffnen|Dashboard-Größe|Open Dashboard/);
});

test("standard manifest localization replaces custom translation injection", () => {
  assert.deepEqual(manifest.languages.map(entry => entry.lang).sort(), ["de", "en"]);
  assert.deepEqual(manifest.languages.map(entry => entry.path).sort(), ["lang/de.json", "lang/en.json"]);
  const joined = `${main}\n${dashboard}`;
  assert.doesNotMatch(joined, /ensureModuleTranslations|installModuleTranslations|expandDottedTranslations|_translationsReady/);
  assert.doesNotMatch(joined, /fetch\([^)]*lang\//);
});

test("settings registration is idempotent, verifiable, and independent of eager dashboard imports", () => {
  assert.doesNotMatch(settings, /^import .*apps\/dashboard/m);
  assert.match(settings, /game\.settings\?\.settings\?\.has/);
  assert.match(settings, /game\.settings\?\.menus\?\.has/);
  assert.match(settings, /expectedSettingsKeys/);
  assert.match(settings, /verifySettingsRegistration/);
  assert.match(settings, /await import\("\.\/apps\/dashboard\.mjs"\)/);
  assert.match(main, /const settings = registerSettings\(\)/);
  assert.ok((main.match(/const settings = registerSettings\(\)/g) ?? []).length >= 2);
  assert.match(main, /if \(!settings\.valid\)/);
  assert.match(main, /settings-ready-retry/);
});

test("aquatic D&D dashboard foregrounding waits for rendering", () => {
  assert.match(dashboard, /export async function openAquaticDndDashboard/);
  assert.match(dashboard, /await instance\.render\(\{ force: true \}\)/);
  assert.match(dashboard, /instance\?\.rendered && instance\.element/);
});
