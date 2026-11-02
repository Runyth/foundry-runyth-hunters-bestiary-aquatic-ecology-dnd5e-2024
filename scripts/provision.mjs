// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, PROVIDER_ID, SETTINGS, CORE_ID } from "./constants.mjs";
import { buildActorData, buildHarvestItemData } from "./builder.mjs";
import { loadStatblockData } from "./data.mjs";
import { localizeContent } from "./localization.mjs";

function requireGm() { if (!game.user?.isGM) throw new Error(game.i18n.localize("HBAEDND.Error.GMOnly")); }
function flag(document, key) { return document?.getFlag?.(MODULE_ID, key) ?? document?.flags?.[MODULE_ID]?.[key]; }
function folderId(document) { return typeof document?.folder === "string" ? document.folder : document?.folder?.id; }

export function isImportedActor(actor) {
  return flag(actor, "managed") === true
    && flag(actor, "providerId") === PROVIDER_ID
    && typeof flag(actor, "managedKey") === "string"
    && typeof flag(actor, "monsterId") === "string";
}

export function isImportedHarvestItem(item) {
  return flag(item, "managed") === true
    && flag(item, "providerId") === PROVIDER_ID
    && typeof flag(item, "managedKey") === "string"
    && typeof flag(item, "harvestId") === "string";
}

export function isImportedFolder(folder) {
  return flag(folder, "managed") === true
    && flag(folder, "providerId") === PROVIDER_ID
    && ["actor-import-folder", "item-import-folder"].includes(flag(folder, "kind"));
}

async function ensureFolder(type, name) {
  let folder = game.folders.find((entry) => entry.type === type && entry.name === name && !entry.folder);
  if (folder) return folder;
  const kind = type === "Actor" ? "actor-import-folder" : "item-import-folder";
  folder = await Folder.create({
    name,
    type,
    sorting: "a",
    folder: null,
    flags: {
      [MODULE_ID]: { managed: true, providerId: PROVIDER_ID, kind }
    }
  });
  return folder;
}

function managedActor(record) {
  return game.actors.find((actor) => isImportedActor(actor) && (flag(actor, "managedKey") === record.managedKey || flag(actor, "monsterId") === record.id));
}

export function managedItem(item) { return flag(item, "managed") === true && flag(item, "providerId") === PROVIDER_ID; }
export function buildManagedActorUpdate(actor, source) { return { img: source.img, system: source.system, prototypeToken: source.prototypeToken, [`flags.${MODULE_ID}`]: source.flags[MODULE_ID], "flags.runyth-hunters-bestiary": { ...(actor.flags?.["runyth-hunters-bestiary"] ?? {}), ...source.flags["runyth-hunters-bestiary"] } }; }

export async function provisionActors({ update = false, monsterIds, onProgress } = {}) {
  requireGm();
  const data = await loadStatblockData();
  const selectedIds = monsterIds?.length ? new Set(monsterIds) : null;
  const selected = data.statblocks.filter(record => !selectedIds || selectedIds.has(record.id));
  const folder = await ensureFolder("Actor", game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER));
  const actorsByManagedKey = new Map();
  const actorsByMonsterId = new Map();
  for (const actor of game.actors?.contents ?? game.actors ?? []) {
    if (!isImportedActor(actor)) continue;
    actorsByManagedKey.set(flag(actor, "managedKey"), actor);
    actorsByMonsterId.set(flag(actor, "monsterId"), actor);
  }

  const results = new Array(selected.length);
  const errors = [];
  let success = 0;
  let skipped = 0;
  let completed = 0;

  await mapWithConcurrency(selected, async (record, index) => {
    const label = localizeContent(record.name) || record.id;
    try {
      const effectiveImage = globalThis.game?.modules?.get?.(CORE_ID)?.api?.getMonsterImage?.(record.id)?.imagePath ?? record.img;
      const source = buildActorData({ ...record, img: effectiveImage });
      let actor = actorsByManagedKey.get(record.managedKey) ?? actorsByMonsterId.get(record.id) ?? null;
      let operation = "skipped";
      if (!actor) {
        actor = await Actor.create({ ...source, folder: folder.id }, { renderSheet: false, render: false });
        operation = "imported";
        success += 1;
        actorsByManagedKey.set(record.managedKey, actor);
        actorsByMonsterId.set(record.id, actor);
      } else if (update) {
        const updateSource = buildManagedActorUpdate(actor, source);
        await actor.update(updateSource, { render: false });
        const currentManaged = actor.items.filter(managedItem);
        if (currentManaged.length) await actor.deleteEmbeddedDocuments("Item", currentManaged.map(item => item.id), { render: false });
        if (source.items.length) await actor.createEmbeddedDocuments("Item", source.items, { render: false });
        operation = "updated";
        success += 1;
      } else {
        skipped += 1;
      }
      results[index] = { actor, operation, monsterId: record.id };
      return { label: actor.name, operation };
    } catch (error) {
      const failure = { operation: "failed", monsterId: record.id, label, message: error?.message ?? String(error), error };
      results[index] = failure;
      errors.push(failure);
      return { label, operation: "failed", error };
    }
  }, {
    concurrency: 3,
    onSettled: outcome => {
      completed += 1;
      onProgress?.({
        current: completed,
        total: selected.length,
        label: outcome.label,
        operation: outcome.operation,
        success,
        skipped,
        failed: errors.length,
        errors,
        ...(outcome.error ? { error: outcome.error } : {})
      });
    }
  });
  return results;
}

export async function createHarvestItems({ monsterIds, onProgress } = {}) {
  requireGm();
  const data = await loadStatblockData();
  const selectedIds = monsterIds?.length ? new Set(monsterIds) : null;
  const records = data.statblocks.filter(record => !selectedIds || selectedIds.has(record.id));
  const folder = await ensureFolder("Item", game.settings.get(MODULE_ID, SETTINGS.ITEM_FOLDER));
  const sources = records.flatMap(record => record.harvestItems.map(harvest => ({ record, harvest, source: buildHarvestItemData(record, harvest) })));
  const existingByKey = new Map();
  for (const item of game.items?.contents ?? game.items ?? []) {
    if (isImportedHarvestItem(item)) existingByKey.set(flag(item, "managedKey"), item);
  }

  const results = new Array(sources.length);
  const errors = [];
  let success = 0;
  let completed = 0;

  await mapWithConcurrency(sources, async (entry, index) => {
    const label = entry.source.name ?? entry.harvest.id;
    try {
      const key = entry.source.flags[MODULE_ID].managedKey;
      let item = existingByKey.get(key) ?? null;
      let operation = "imported";
      if (!item) {
        item = await Item.create({ ...entry.source, folder: folder.id }, { renderSheet: false, render: false });
        existingByKey.set(key, item);
      } else {
        await item.update({
          name: entry.source.name,
          img: entry.source.img,
          system: entry.source.system,
          [`flags.${MODULE_ID}`]: entry.source.flags[MODULE_ID],
          "flags.runyth-hunters-bestiary": { ...(item.flags?.["runyth-hunters-bestiary"] ?? {}), ...entry.source.flags["runyth-hunters-bestiary"] }
        }, { render: false });
        operation = "updated";
      }
      success += 1;
      results[index] = { item, operation, monsterId: entry.record.id, harvestId: entry.harvest.id };
      return { label: item.name, operation };
    } catch (error) {
      const failure = { operation: "failed", monsterId: entry.record.id, harvestId: entry.harvest.id, label, message: error?.message ?? String(error), error };
      results[index] = failure;
      errors.push(failure);
      return { label, operation: "failed", error };
    }
  }, {
    concurrency: 6,
    onSettled: outcome => {
      completed += 1;
      onProgress?.({
        current: completed,
        total: sources.length,
        label: outcome.label,
        operation: outcome.operation,
        success,
        skipped: 0,
        failed: errors.length,
        errors,
        ...(outcome.error ? { error: outcome.error } : {})
      });
    }
  });
  return results;
}

async function mapWithConcurrency(values, worker, { concurrency = 4, onSettled = null } = {}) {
  const items = Array.from(values ?? []);
  const limit = Math.max(1, Math.min(items.length || 1, Math.trunc(Number(concurrency) || 1)));
  let cursor = 0;
  const run = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const result = await worker(items[index], index);
      await onSettled?.(result, index);
    }
  };
  await Promise.all(Array.from({ length: limit }, () => run()));
}

function folderIsEmpty(folder, actors, items, folders) {
  const id = folder.id;
  const hasDocuments = actors.some((actor) => folderId(actor) === id) || items.some((item) => folderId(item) === id);
  const hasChildren = folders.some((candidate) => candidate.id !== id && folderId(candidate) === id);
  return !hasDocuments && !hasChildren;
}

export function collectImportedData({ actors = [], items = [], folders = [] } = {}) {
  return {
    actors: actors.filter(isImportedActor),
    items: items.filter(isImportedHarvestItem),
    folders: folders.filter(isImportedFolder)
  };
}

export async function deleteImportedData({ onProgress, removeEmptyFolders = true } = {}) {
  requireGm();
  const candidates = collectImportedData({ actors: [...(game.actors ?? [])], items: [...(game.items ?? [])], folders: [...(game.folders ?? [])] });
  const total = candidates.actors.length + candidates.items.length + (removeEmptyFolders ? candidates.folders.length : 0);
  let current = 0;
  const report = { actorsDeleted: 0, itemsDeleted: 0, foldersDeleted: 0, foldersRetained: 0, total, failed: [] };
  const progress = (label, operation, error) => onProgress?.({
    current,
    total,
    label,
    operation,
    success: report.actorsDeleted + report.itemsDeleted + report.foldersDeleted,
    skipped: report.foldersRetained,
    failed: report.failed.length,
    errors: report.failed,
    ...(error ? { error } : {})
  });

  const deleteDocuments = async (documents, type, concurrency) => {
    await mapWithConcurrency(documents, async document => {
      try {
        await document.delete({ render: false });
        if (type === "Actor") report.actorsDeleted += 1;
        else report.itemsDeleted += 1;
        return { label: document.name, operation: "deleted" };
      } catch (error) {
        report.failed.push({ type, id: document.id, name: document.name, message: error?.message ?? String(error), error });
        return { label: document.name, operation: "failed", error };
      }
    }, {
      concurrency,
      onSettled: outcome => {
        current += 1;
        progress(outcome.label, outcome.operation, outcome.error);
      }
    });
  };

  await deleteDocuments(candidates.actors, "Actor", 4);
  await deleteDocuments(candidates.items, "Item", 6);

  if (removeEmptyFolders) {
    await mapWithConcurrency(candidates.folders, async folder => {
      try {
        const deleted = folderIsEmpty(folder, game.actors?.contents ?? [...(game.actors ?? [])], game.items?.contents ?? [...(game.items ?? [])], [...(game.folders ?? [])]);
        if (deleted) {
          await folder.delete({ render: false });
          report.foldersDeleted += 1;
        } else report.foldersRetained += 1;
        return { label: folder.name, operation: deleted ? "folderDeleted" : "folderRetained" };
      } catch (error) {
        report.failed.push({ type: "Folder", id: folder.id, name: folder.name, message: error?.message ?? String(error), error });
        return { label: folder.name, operation: "failed", error };
      }
    }, {
      concurrency: 3,
      onSettled: outcome => {
        current += 1;
        progress(outcome.label, outcome.operation, outcome.error);
      }
    });
  }
  return report;
}

