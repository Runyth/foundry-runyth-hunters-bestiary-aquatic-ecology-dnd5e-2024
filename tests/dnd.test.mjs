import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateStatblockPackage } from "../scripts/validation.mjs";
import { buildActorData, buildHarvestItemData, normalizeDnd5eSize } from "../scripts/builder.mjs";
import { buildManagedActorUpdate, managedItem, isImportedActor, isImportedHarvestItem, isImportedFolder, collectImportedData, deleteImportedData, provisionActors } from "../scripts/provision.mjs";
import { atomicRegisterMonsterPack, buildBaseCompatibilityRecords } from "../scripts/registry.mjs";

const en = JSON.parse(fs.readFileSync(new URL("../lang/en.json", import.meta.url)));
const de = JSON.parse(fs.readFileSync(new URL("../lang/de.json", import.meta.url)));
const translate = (value, dictionary = en) => typeof value === "string" && /^(?:HB|HBDND5E|HBAE|HBAEDND)\./.test(value) ? (dictionary[value] ?? value) : value;
const assertLocalized = (value, label) => {
  assert.equal(typeof value, "string", `${label} must be a localization key`);
  assert.match(value, /^HBAEDND\.Content\./, `${label} must use HBAEDND.Content`);
  assert.equal(typeof en[value], "string", `${label} missing English translation`);
  assert.equal(typeof de[value], "string", `${label} missing German translation`);
};
globalThis.game = { i18n: { lang: "en", localize: key => en[key] ?? key } };
globalThis.CONST = { TOKEN_DISPLAY_MODES: { OWNER_HOVER: 20 }, TOKEN_DISPOSITIONS: { HOSTILE: -1 }, DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0 } };
const data = JSON.parse(fs.readFileSync(new URL("../data/statblocks.json", import.meta.url)));
const ecology = JSON.parse(fs.readFileSync(new URL("fixtures/ecology-species.json", import.meta.url)));

test("all twelve stat blocks validate against matching ecology", () => {
  const report = validateStatblockPackage(data, ecology);
  assert.equal(report.valid, true, JSON.stringify(report.issues, null, 2));
  assert.equal(report.counts.statblocks, 12);
});

test("validation reports null ecology entries instead of dereferencing them", () => {
  const malformed = structuredClone(ecology);
  malformed[3] = null;
  assert.doesNotThrow(() => validateStatblockPackage(data, malformed));
  const report = validateStatblockPackage(data, malformed);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(entry => entry.code === "E_ECOLOGY_ENTRY" && entry.path === "ecologySpecies[3]"));
});

test("validation reports null stat-block entries instead of dereferencing them", () => {
  const malformed = structuredClone(data);
  malformed.statblocks[4] = null;
  assert.doesNotThrow(() => validateStatblockPackage(malformed, ecology));
  const report = validateStatblockPackage(malformed, ecology);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(entry => entry.code === "E_RECORD" && entry.path === "statblocks[4]"));
});

test("every Actor uses the 2024 marker and hostile unlinked token", () => {
  for (const record of data.statblocks) {
    const actor = buildActorData(record);
    assert.equal(actor.type, "npc"); assert.equal(actor.system.details.source.rules, "2024");
    assert.equal(actor.prototypeToken.actorLink, false); assert.equal(actor.prototypeToken.disposition, -1);
    assert.equal(actor.ownership.default, 0); assert.equal(actor.flags["runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024"].managedKey, record.managedKey);
  }
});
test("Actor builder converts ecology size names to D&D 5e 5.3.3 size keys and token dimensions", () => {
  const expectedKeys = { tiny: "tiny", small: "sm", medium: "med", large: "lg", huge: "huge", gargantuan: "grg" };
  const expectedTokenSizes = { tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 };
  for (const record of data.statblocks) {
    const actor = buildActorData(record);
    const expectedKey = expectedKeys[record.size];
    assert.equal(normalizeDnd5eSize(record.size), expectedKey, record.id);
    assert.equal(actor.system.traits.size, expectedKey, record.id);
    assert.equal(actor.prototypeToken.width, expectedTokenSizes[expectedKey], record.id);
    assert.equal(actor.prototypeToken.height, expectedTokenSizes[expectedKey], record.id);
  }
});

test("Import missing Actors creates all twelve records under the D&D 5e pre-create size contract", async () => {
  const previous = {
    game: globalThis.game,
    Actor: globalThis.Actor,
    Folder: globalThis.Folder,
    CONFIG: globalThis.CONFIG,
    fetch: globalThis.fetch
  };
  const actors = [];
  const folders = [];
  const actorSizes = { tiny: { token: 0.5 }, sm: { token: 1 }, med: { token: 1 }, lg: { token: 2 }, huge: { token: 3 }, grg: { token: 4 } };
  globalThis.CONFIG = { DND5E: { actorSizes } };
  globalThis.fetch = async () => ({ ok: true, json: async () => structuredClone(data) });
  globalThis.game = {
    user: { isGM: true },
    i18n: { lang: "en", localize: (key) => key },
    actors,
    items: [],
    folders,
    settings: { get: () => "Runyth Hunter's Bestiary — Aquatic Actors" }
  };
  globalThis.Folder = {
    async create(source) {
      const folder = { ...source, id: "aquatic-actor-folder", getFlag(moduleId, key) { return this.flags?.[moduleId]?.[key]; } };
      folders.push(folder);
      return folder;
    }
  };
  globalThis.Actor = {
    async create(source) {
      const tokenSize = actorSizes[source.system?.traits?.size]?.token;
      assert.notEqual(tokenSize, undefined, `${source.name}: invalid D&D size key ${source.system?.traits?.size}`);
      assert.equal(source.prototypeToken.width, tokenSize, source.name);
      assert.equal(source.prototypeToken.height, tokenSize, source.name);
      const actor = {
        ...source,
        id: `actor-${actors.length + 1}`,
        items: source.items ?? [],
        getFlag(moduleId, key) { return this.flags?.[moduleId]?.[key]; }
      };
      actors.push(actor);
      return actor;
    }
  };
  const progress = [];
  try {
    const results = await provisionActors({ update: false, onProgress: (entry) => progress.push(entry) });
    assert.equal(results.length, 12);
    assert.equal(results.filter((entry) => entry.operation === "imported").length, 12);
    assert.equal(actors.length, 12);
    assert.equal(progress.length, 12);
    assert.equal(progress.at(-1).current, 12);
    assert.equal(progress.at(-1).total, 12);
  } finally {
    globalThis.game = previous.game;
    globalThis.Actor = previous.Actor;
    globalThis.Folder = previous.Folder;
    globalThis.CONFIG = previous.CONFIG;
    globalThis.fetch = previous.fetch;
  }
});
test("Import missing Actors resumes safely after the two-Actor partial state", async () => {
  const previous = { game: globalThis.game, Actor: globalThis.Actor, Folder: globalThis.Folder, CONFIG: globalThis.CONFIG };
  const actorSizes = { tiny: { token: 0.5 }, sm: { token: 1 }, med: { token: 1 }, lg: { token: 2 }, huge: { token: 3 }, grg: { token: 4 } };
  const folders = [{ id: "aquatic-actor-folder", name: "Runyth Hunter's Bestiary — Aquatic Actors", type: "Actor", folder: null }];
  const actors = data.statblocks.slice(0, 2).map((record, index) => {
    const source = buildActorData(record);
    return { ...source, id: `existing-${index + 1}`, items: source.items, getFlag(moduleId, key) { return this.flags?.[moduleId]?.[key]; } };
  });
  globalThis.CONFIG = { DND5E: { actorSizes } };
  globalThis.game = {
    user: { isGM: true }, i18n: { lang: "en", localize: (key) => key }, actors, items: [], folders,
    settings: { get: () => "Runyth Hunter's Bestiary — Aquatic Actors" }
  };
  globalThis.Folder = { async create() { throw new Error("Existing Actor folder should be reused."); } };
  globalThis.Actor = {
    async create(source) {
      const tokenSize = actorSizes[source.system?.traits?.size]?.token;
      assert.notEqual(tokenSize, undefined, `${source.name}: invalid D&D size key`);
      const actor = { ...source, id: `actor-${actors.length + 1}`, items: source.items ?? [], getFlag(moduleId, key) { return this.flags?.[moduleId]?.[key]; } };
      actors.push(actor);
      return actor;
    }
  };
  try {
    const results = await provisionActors({ update: false });
    assert.equal(results.filter((entry) => entry.operation === "skipped").length, 2);
    assert.equal(results.filter((entry) => entry.operation === "imported").length, 10);
    assert.equal(actors.length, 12);
    assert.equal(new Set(actors.map((actor) => actor.getFlag("runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", "monsterId"))).size, 12);
  } finally {
    globalThis.game = previous.game; globalThis.Actor = previous.Actor; globalThis.Folder = previous.Folder; globalThis.CONFIG = previous.CONFIG;
  }
});

test("Actor import continues after an individual failure and reports every result", async () => {
  const previous = { game: globalThis.game, Actor: globalThis.Actor, Folder: globalThis.Folder, CONFIG: globalThis.CONFIG };
  const actors = [];
  const folders = [];
  globalThis.CONFIG = { DND5E: { actorSizes: { tiny: { token: 0.5 }, sm: { token: 1 }, med: { token: 1 }, lg: { token: 2 }, huge: { token: 3 }, grg: { token: 4 } } } };
  globalThis.game = {
    user: { isGM: true },
    i18n: { lang: "en", localize: key => key },
    actors,
    items: [],
    folders,
    settings: { get: () => "Runyth Hunter's Bestiary — Aquatic Actors" }
  };
  globalThis.Folder = {
    async create(source) {
      const folder = { ...source, id: "failure-test-folder", getFlag(moduleId, key) { return this.flags?.[moduleId]?.[key]; } };
      folders.push(folder);
      return folder;
    }
  };
  let attempts = 0;
  globalThis.Actor = {
    async create(source) {
      attempts += 1;
      if (attempts === 3) throw new Error("third actor failed");
      const actor = { ...source, id: `actor-${attempts}`, items: source.items ?? [], getFlag(moduleId, key) { return this.flags?.[moduleId]?.[key]; } };
      actors.push(actor);
      return actor;
    }
  };
  const progress = [];
  try {
    const results = await provisionActors({ onProgress: entry => progress.push(entry) });
    assert.equal(results.length, 12);
    assert.equal(results.filter(entry => entry.operation === "failed").length, 1);
    assert.equal(results.filter(entry => entry.operation === "imported").length, 11);
    assert.equal(actors.length, 11);
    assert.equal(progress.at(-1).failed, 1);
    assert.equal(progress.at(-1).errors.length, 1);
    assert.equal(progress.at(-1).current, 12);
  } finally {
    globalThis.game = previous.game;
    globalThis.Actor = previous.Actor;
    globalThis.Folder = previous.Folder;
    globalThis.CONFIG = previous.CONFIG;
  }
});

test("movement and respiration are mechanically coherent", () => {
  for (const record of data.statblocks) {
    if (record.respiration === "sessile-water") assert.equal(record.movement.swim, 0);
    else assert.ok(record.movement.swim > 0);
    if (record.respiration === "amphibious") { assert.ok(record.movement.walk > 0); assert.ok(record.movement.swim > 0); }
    if (record.respiration === "air-breathing") assert.ok(record.traits.some((trait) => trait.respirationFeature === true));
  }
});
test("CR is absolute, varied, and encounter metadata agrees", () => {
  const crs = data.statblocks.map((record) => record.cr);
  assert.ok(new Set(crs).size >= 8); assert.equal(Math.min(...crs), 0.5); assert.equal(Math.max(...crs), 15);
  for (const record of data.statblocks) { assert.equal(record.encounter.cr, record.cr); assert.equal(record.encounter.xp, record.xp); assert.equal(record.encounter.fightsToDeath, false); }
});
test("Actions produce D&D 5.3 activity Items exactly once", () => {
  for (const record of data.statblocks) {
    const actor = buildActorData(record);
    const actionItems = actor.items.filter((item) => Object.keys(item.system.activities).length);
    assert.equal(actionItems.length, record.actions.length + record.reactions.length);
    for (const item of actionItems) assert.equal(Object.keys(item.system.activities).length, 1);
  }
});
test("harvest builder creates priced nonmagical loot Items", () => {
  for (const record of data.statblocks) for (const harvest of record.harvestItems) {
    const item = buildHarvestItemData(record, harvest);
    assert.equal(item.type, "loot"); assert.ok(item.system.price.value > 0); assert.equal(item.system.source.rules, "2024"); assert.equal(item.ownership.default, 0);
    assert.match(item.system.description.value, /Preservation/);
  }
});
test("managed content keys are globally unique", () => {
  const keys = data.statblocks.flatMap((record) => [record.managedKey, ...record.traits.map((x)=>x.id), ...record.actions.map((x)=>x.id), ...record.reactions.map((x)=>x.id), ...record.harvestItems.map((x)=>`${record.id}:harvest:${x.id}`)]);
  assert.equal(new Set(keys).size, keys.length);
});
test("no bundled legendary actions or unsupported supernatural inflation", () => {
  for (const record of data.statblocks) { assert.deepEqual(record.legendaryActions, []); assert.ok(!record.traits.some((trait) => /Legendary Resistance|Regeneration|Magic Resistance/i.test(translate(trait.name)))); }
});
test("each sign maps to a native field check instead of one universal skill", () => {
  const skills = new Set(data.statblocks.flatMap((record) => Object.values(record.fieldChecks).map((entry) => entry.skill)));
  assert.ok(skills.size >= 5);
  for (const record of data.statblocks) assert.equal(Object.keys(record.fieldChecks).length, 3);
});
test("incomplete stat blocks fail with exact issue paths", () => {
  const broken = structuredClone(data); broken.statblocks[0].movement.swim = 0;
  const report = validateStatblockPackage(broken, ecology); assert.equal(report.valid, false); assert.ok(report.issues.some((entry) => entry.path.includes("movement.swim")));
});
test("all provider-managed embedded Items carry both provenance flag namespaces", () => {
  for (const record of data.statblocks) for (const item of buildActorData(record).items) {
    assert.equal(item.flags["runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024"].managed, true);
    assert.equal(item.flags["runyth-hunters-bestiary"].providerId, "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024");
  }
});
test("harvest data carries preservation, risk, law, and source species", () => {
  for (const record of data.statblocks) for (const harvest of record.harvestItems) {
    assertLocalized(harvest.preservation, `${harvest.id}.preservation`); assertLocalized(harvest.risks, `${harvest.id}.risks`); assertLocalized(harvest.legalStatus, `${harvest.id}.legalStatus`); assert.ok(harvest.spoilageHours > 0);
  }
});


test("managed Actor refresh preserves identity, folder, ownership, notes, unrelated flags, custom Items, and effects", () => {
  const record = data.statblocks[0]; const source = buildActorData(record);
  const actor = { id: "actor-identity", name: "Campaign Name", folder: { id: "folder-1" }, ownership: { default: 2 }, flags: { campaign: { notes: "keep" }, "runyth-hunters-bestiary": { campaignNote: "keep" } }, items: [{ id: "custom", getFlag: () => false }], effects: [{ id: "custom-effect" }] };
  const update = buildManagedActorUpdate(actor, source);
  assert.equal(update.name, undefined); assert.equal(update.folder, undefined); assert.equal(update.ownership, undefined); assert.equal(update.flags, undefined);
  assert.equal(update["flags.runyth-hunters-bestiary"].campaignNote, "keep");
  assert.equal(actor.items.length, 1); assert.equal(actor.effects.length, 1); assert.equal(managedItem(actor.items[0]), false);
});

test("atomic monster-pack registration rolls back ecology when D&D registration fails", async () => {
  const calls=[]; const ecologyApi={ registerAquaticExpansion: async()=>calls.push("eco-register"), unregisterAquaticExpansion: async()=>calls.push("eco-rollback") };
  await assert.rejects(() => atomicRegisterMonsterPack("third-party", { ecology: {}, statblocks: {} }, { ecologyApi, registerDnd: async()=>{ calls.push("dnd-register"); throw new Error("fail"); }, unregisterDnd: async()=>calls.push("dnd-rollback") }));
  assert.deepEqual(calls,["eco-register","dnd-register","eco-rollback"]);
});


test("D&D integration has no broad sheet, HUD, Scene Control, Chat, canvas, socket, or global keyboard hooks", () => {
  const root = new URL("../", import.meta.url);
  const files = ["scripts/main.mjs","scripts/api.mjs","scripts/provision.mjs","scripts/apps/dashboard.mjs","scripts/field-checks.mjs"];
  const source = files.map((file) => fs.readFileSync(new URL(file, root), "utf8")).join("\n");
  for (const forbidden of ["renderApplication", "renderApplicationV2", "renderActorSheet", "renderItemSheet", "renderTokenHUD", "getSceneControlButtons", "renderChatMessage", "canvas.", "game.socket", "window.addEventListener", "ChatMessage.create"]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.match(source, /Hooks\.once\("init"/); assert.match(source, /Hooks\.once\("ready"/);
});

test("D&D manifest paths, exact dependencies, localization, and imports resolve", () => {
  const root = new URL("../", import.meta.url); const manifest = JSON.parse(fs.readFileSync(new URL("module.json", root)));
  for (const file of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map((x)=>x.path)]) assert.equal(fs.existsSync(new URL(file, root)), true, file);
  const req = new Map(manifest.relationships.requires.map((x)=>[x.id,x.compatibility.minimum]));
  assert.equal(req.get("runyth-hunters-bestiary"),"1.4.2"); assert.equal(req.get("runyth-hunters-bestiary-dnd5e-2024"),"1.2.2"); assert.equal(req.get("runyth-hunters-bestiary-aquatic-ecology"),"1.2.4");
  const en=JSON.parse(fs.readFileSync(new URL("lang/en.json",root))); const de=JSON.parse(fs.readFileSync(new URL("lang/de.json",root))); assert.deepEqual(Object.keys(en).sort(),Object.keys(de).sort());
  for (const file of ["scripts/main.mjs","scripts/api.mjs","scripts/registry.mjs","scripts/provision.mjs","scripts/builder.mjs"]) { const source=fs.readFileSync(new URL(file,root),"utf8"); for(const match of source.matchAll(/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["'](\.[^"']+)["']/g)) assert.equal(fs.existsSync(new URL(match[1],new URL(file,root))),true,`${file}: ${match[1]}`); }
});

test("D&D API protects provisioning, source builders, encounter profiles, and dashboard", () => {
  const source=fs.readFileSync(new URL("../scripts/api.mjs",import.meta.url),"utf8");
  for(const method of ["buildActorData","provisionActors","buildHarvestItemData","createHarvestItems","getEncounterProfile","open"]) assert.ok(source.indexOf(method)>=0);
  assert.ok((source.match(/requireGm\(\)/g)??[]).length>=6);
});

test("D&D CSS is isolated", () => {
  const css=fs.readFileSync(new URL("../styles/runyth-hunters-bestiary-aquatic-ecology.css",import.meta.url),"utf8");
  for(const selector of ["button","input",".window-header",".application",".tab",".sr-only"]) assert.equal(new RegExp(`(^|\\n)\\s*${selector.replace(".","\\.")}\\b`).test(css),false,selector);
});


test("base-registry compatibility records carry complete Actor, harvest, and encounter representations", () => {
  const records = buildBaseCompatibilityRecords(data.statblocks);
  assert.equal(records.length, 12);
  for (const [index, record] of records.entries()) {
    assert.equal(record.monsterId, data.statblocks[index].id);
    assert.equal(record.actorData.type, "npc");
    assert.equal(record.actor.type, "npc");
    assert.equal(record.harvestItems.length, 3);
    assert.equal(record.encounterProfile.cr, data.statblocks[index].cr);
    assert.equal(record.type, data.statblocks[index].creatureType);
  }
});

test("progress DialogV2 has a required button and no empty button configuration", () => {
  const source = fs.readFileSync(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  assert.equal(source.includes("buttons: []"), false);
  assert.match(source, /buttons:\s*\[\{\s*action:\s*"close"/);
});

test("dashboard uses Import terminology and exposes confirmed deletion", () => {
  const template = fs.readFileSync(new URL("../templates/dashboard.hbs", import.meta.url), "utf8");
  const en = JSON.parse(fs.readFileSync(new URL("../lang/en.json", import.meta.url)));
  assert.match(en["HBAEDND.ImportMissing"], /^Import /);
  assert.match(en["HBAEDND.ImportHarvests"], /^Import /);
  assert.match(en["HBAEDND.Delete.Button"], /^Delete all imported data$/);
  assert.match(template, /hbaedndImportActors/);
  assert.match(template, /hbaedndDeleteImported/);
  assert.equal(template.includes("hbaedndCreateActors"), false);
});

function mockDocument(name, flags, collection, folder = null) {
  const document = {
    id: `${name}-id`, name, flags: { "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024": flags }, folder,
    getFlag(moduleId, key) { return this.flags[moduleId]?.[key]; },
    async delete() { const index = collection.indexOf(this); if (index >= 0) collection.splice(index, 1); this.deleted = true; }
  };
  collection.push(document);
  return document;
}

test("import provenance predicates reject unrelated and other-provider documents", () => {
  const actors = [], items = [], folders = [];
  const actor = mockDocument("managed actor", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", managedKey: "aquatic:test", monsterId: "test" }, actors);
  const unrelatedActor = mockDocument("unrelated actor", { managed: true, providerId: "other-provider", managedKey: "aquatic:test", monsterId: "test" }, actors);
  const item = mockDocument("managed item", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", managedKey: "aquatic:test:harvest:x", monsterId: "test", harvestId: "x" }, items);
  const folder = mockDocument("managed folder", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", kind: "actor-import-folder" }, folders);
  const userFolder = mockDocument("user folder", {}, folders);
  assert.equal(isImportedActor(actor), true); assert.equal(isImportedActor(unrelatedActor), false);
  assert.equal(isImportedHarvestItem(item), true); assert.equal(isImportedFolder(folder), true); assert.equal(isImportedFolder(userFolder), false);
  const selected = collectImportedData({ actors, items, folders });
  assert.deepEqual(selected.actors, [actor]); assert.deepEqual(selected.items, [item]); assert.deepEqual(selected.folders, [folder]);
});

test("deleteImportedData removes only exact imported documents and empty module-created folders", async () => {
  const previousGame = globalThis.game;
  const actors = [], items = [], folders = [];
  const importedActor = mockDocument("imported actor", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", managedKey: "aquatic:test", monsterId: "test" }, actors);
  const unrelatedActor = mockDocument("unrelated actor", { managed: true, providerId: "another-provider", managedKey: "x", monsterId: "x" }, actors);
  const importedItem = mockDocument("imported item", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", managedKey: "aquatic:test:harvest:x", monsterId: "test", harvestId: "x" }, items);
  const unrelatedItem = mockDocument("unrelated item", {}, items);
  const emptyManagedFolder = mockDocument("empty managed folder", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", kind: "actor-import-folder" }, folders);
  const nonEmptyManagedFolder = mockDocument("non-empty managed folder", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", kind: "item-import-folder" }, folders);
  unrelatedItem.folder = nonEmptyManagedFolder;
  const userFolder = mockDocument("user folder", {}, folders);
  globalThis.game = { user: { isGM: true }, i18n: { localize: (key) => key }, actors, items, folders };
  const report = await deleteImportedData();
  assert.equal(importedActor.deleted, true); assert.equal(importedItem.deleted, true); assert.equal(emptyManagedFolder.deleted, true);
  assert.equal(unrelatedActor.deleted, undefined); assert.equal(unrelatedItem.deleted, undefined); assert.equal(nonEmptyManagedFolder.deleted, undefined); assert.equal(userFolder.deleted, undefined);
  assert.deepEqual(report, { actorsDeleted: 1, itemsDeleted: 1, foldersDeleted: 1, foldersRetained: 1, total: 4, failed: [] });
  globalThis.game = previousGame;
});

test("deleteImportedData retains failures while continuing other deletions", async () => {
  const previousGame = globalThis.game;
  const actors = [], items = [], folders = [];
  const failingActor = mockDocument("failing actor", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", managedKey: "aquatic:fail", monsterId: "fail" }, actors);
  failingActor.delete = async () => { throw new Error("actor delete failed"); };
  const successfulItem = mockDocument("successful item", { managed: true, providerId: "runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024", managedKey: "aquatic:ok:harvest:x", monsterId: "ok", harvestId: "x" }, items);
  globalThis.game = { user: { isGM: true }, i18n: { localize: key => key }, actors, items, folders };
  const progress = [];
  try {
    const report = await deleteImportedData({ onProgress: entry => progress.push(entry) });
    assert.equal(report.actorsDeleted, 0);
    assert.equal(report.itemsDeleted, 1);
    assert.equal(report.failed.length, 1);
    assert.match(report.failed[0].message, /actor delete failed/);
    assert.equal(successfulItem.deleted, true);
    assert.equal(progress.at(-1).current, 2);
    assert.equal(progress.at(-1).failed, 1);
  } finally {
    globalThis.game = previousGame;
  }
});

test("public API includes import aliases and GM-only deletion", () => {
  const source = fs.readFileSync(new URL("../scripts/api.mjs", import.meta.url), "utf8");
  for (const method of ["importActors", "importHarvestItems", "deleteImportedData", "provisionActors", "createHarvestItems"]) assert.match(source, new RegExp(method));
  assert.match(source, /deleteImportedData:\s*async \(options\) => \{ requireGm\(\)/);
});

test("dashboard is resizable, saves final geometry, and filters search in place", () => {
  const source = fs.readFileSync(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  assert.match(source, /resizable: true/);
  assert.match(source, /bindStableSearch/);
  assert.equal(/input[\s\S]{0,500}this\.render\(\{ force: true \}\)/.test(source), false);
  assert.match(source, /async _preClose\(options\)[\s\S]*persistence = geometry\?\.flush/);
  assert.match(source, /Promise\.resolve\(persistence\)\.catch/);
  assert.doesNotMatch(source, /await this\.#geometry\?\.flush/);
});

test("official subject-system layer registers canonical metadata and uses shared dashboard validation", () => {
  const main = fs.readFileSync(new URL("../scripts/main.mjs", import.meta.url), "utf8");
  const dashboard = fs.readFileSync(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  assert.match(main, /type: "subject-system-layer"/);
  assert.match(main, /subject: "Aquatic Ecology"/);
  assert.match(main, /gameSystem: "D&D 5e 2024"/);
  assert.match(dashboard, /validateDashboardModuleName/);
});


test("Aquatic D&D progress operations auto-close only clean success and retain failures", () => {
  const source = fs.readFileSync(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  assert.match(source, /autoCloseOnSuccess:\s*true/);
  assert.match(source, /foregroundOnFailure:\s*true/);
  assert.match(source, /operationHasFailures\(results\)/);
  assert.match(source, /operationHasFailures\(report\)/);
});

test("provisioning and deletion continue while reporting per-document failures", () => {
  const source = fs.readFileSync(new URL("../scripts/provision.mjs", import.meta.url), "utf8");
  assert.match(source, /operation:\s*"failed"/);
  assert.match(source, /errors,?/);
  assert.match(source, /failed:\s*\[\]/);
  assert.match(source, /report\.failed\.push/);
});
