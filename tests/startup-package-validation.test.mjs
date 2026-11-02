import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const statblocks = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8"));
const ecologyFixture = JSON.parse(await readFile(new URL("fixtures/ecology-species.json", import.meta.url), "utf8"));

test("all 12 packaged stat blocks validate and the companion reaches ready state", async () => {
  const previous = {
    foundry: globalThis.foundry,
    Hooks: globalThis.Hooks,
    game: globalThis.game,
    CONST: globalThis.CONST,
    fetch: globalThis.fetch
  };
  const callbacks = new Map();
  const settings = new Map();
  const menus = new Map();
  let registered = [];

  class ApplicationV2 {}
  globalThis.foundry = {
    applications: { api: { ApplicationV2, HandlebarsApplicationMixin: Base => Base }, instances: new Map() },
    utils: { deepClone: value => structuredClone(value) }
  };
  globalThis.Hooks = { once: (name, callback) => callbacks.set(name, callback), callAll: () => undefined };
  globalThis.CONST = {
    TOKEN_DISPLAY_MODES: { OWNER_HOVER: 20 },
    TOKEN_DISPOSITIONS: { HOSTILE: -1 },
    DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0 }
  };
  globalThis.fetch = async url => {
    assert.match(String(url), /data\/statblocks\.json$/);
    return { ok: true, status: 200, json: async () => structuredClone(statblocks) };
  };

  const readyApi = extra => ({
    initializationStatus: { ready: true, ok: true, failures: [] },
    whenReady: async function () { return this; },
    ...extra
  });
  const coreApi = readyApi({
    ui: {},
    registerComplementaryModule: () => undefined,
    warnForInvalidComplementaryModuleName: () => ({ warned: false })
  });
  const baseApi = readyApi({
    getRegistryContract: () => ({ version: "1.1.0" }),
    validateStatblocks: records => ({ valid: true, complete: true, reports: records.map(record => ({ valid: true, monsterId: record.monsterId, issues: [] })) }),
    registerStatblocks: (_providerId, records) => { registered = structuredClone(records); return { contractVersion: "1.1.0" }; },
    unregisterStatblocks: () => { registered = []; },
    getStatblocks: () => structuredClone(registered)
  });
  const ecologyApi = readyApi({
    getStatus: () => ({ ready: true, ok: true, failures: [] }),
    getSpecies: async () => ecologyFixture.map(({ id }) => ({ id }))
  });
  const target = { active: true, title: "Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024", version: "1.3.5", api: null };
  globalThis.game = {
    system: { id: "dnd5e", version: "5.3.3" },
    user: { isGM: true },
    i18n: { lang: "en", localize: key => key },
    modules: new Map([
      ["hunters-bestiary", { active: true, api: coreApi }],
      ["hunters-bestiary-dnd5e-2024", { active: true, api: baseApi }],
      ["hunters-bestiary-aquatic-ecology", { active: true, api: ecologyApi }],
      ["hunters-bestiary-aquatic-ecology-dnd5e-2024", target]
    ]),
    settings: {
      settings,
      menus,
      register: (moduleId, key, config) => settings.set(`${moduleId}.${key}`, config),
      registerMenu: (moduleId, key, config) => menus.set(`${moduleId}.${key}`, config),
      get: () => undefined,
      set: async () => undefined
    }
  };

  try {
    await import(new URL(`../scripts/main.mjs?startup-package=${Date.now()}`, import.meta.url));
    assert.equal(typeof callbacks.get("init"), "function");
    assert.equal(typeof callbacks.get("ready"), "function");
    callbacks.get("init")();
    await callbacks.get("ready")();

    const status = target.api.getStatus();
    assert.equal(status.ready, true);
    assert.deepEqual(status.failures, []);
    assert.equal(status.providerRegistered, true);
    assert.equal(registered.length, 12);
    assert.deepEqual(new Set(registered.map(record => record.monsterId)), new Set(statblocks.statblocks.map(record => record.id)));
  } finally {
    globalThis.foundry = previous.foundry;
    globalThis.Hooks = previous.Hooks;
    globalThis.game = previous.game;
    globalThis.CONST = previous.CONST;
    globalThis.fetch = previous.fetch;
  }
});
