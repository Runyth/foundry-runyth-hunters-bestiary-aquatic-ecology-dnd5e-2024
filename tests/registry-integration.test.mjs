// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildActorData } from "../scripts/builder.mjs";
import { getIntegrationStatus, registerStatblocks, registerWithBase } from "../scripts/registry.mjs";

const data = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8"));
const ecology = JSON.parse(await readFile(new URL("fixtures/ecology-species.json", import.meta.url), "utf8"));

function clone(value) { return structuredClone(value); }

function createBaseApi({ ready = Promise.resolve(), reject = false } = {}) {
  const providers = new Map();
  const calls = [];
  return {
    calls,
    whenReady: () => ready,
    getRegistryContract: () => ({ version: "1.1.0" }),
    validateStatblocks(records) {
      calls.push(["validate", records.length]);
      if (reject) return {
        valid: false,
        complete: false,
        reports: [{ monsterId: records[0]?.monsterId, issues: [{ rule: "forced-invalid", field: "hp", message: "forced rejection" }] }]
      };
      const reports = records.map(record => ({
        monsterId: record.monsterId,
        complete: Boolean(record.monsterId && record.hp?.value > 0 && record.hp?.formula && record.actions?.length && record.traits?.length && record.harvest?.length),
        issues: []
      }));
      return { valid: reports.every(report => report.complete), complete: reports.every(report => report.complete), reports };
    },
    registerStatblocks(providerId, records, { replaceProviderContent = true } = {}) {
      calls.push(["register", providerId, records.length]);
      if (replaceProviderContent) providers.delete(providerId);
      providers.set(providerId, clone(records));
      return { providerId, count: records.length, complete: true, contractVersion: "1.1.0" };
    },
    unregisterStatblocks(providerId) {
      calls.push(["unregister", providerId]);
      const count = providers.get(providerId)?.length ?? 0;
      providers.delete(providerId);
      return count;
    },
    getStatblocks({ providerId } = {}) {
      if (providerId) return clone(providers.get(providerId) ?? []);
      return [...providers.values()].flatMap(clone);
    }
  };
}

function installRuntime(baseApi) {
  const previous = { game: globalThis.game, foundry: globalThis.foundry };
  globalThis.foundry = { utils: { deepClone: clone } };
  globalThis.game = {
    user: { isGM: true },
    i18n: { lang: "en", localize: key => key },
    modules: new Map([
      ["runyth-hunters-bestiary-dnd5e-2024", { api: baseApi }],
      ["runyth-hunters-bestiary-aquatic-ecology", { api: { whenReady: async () => undefined, getSpecies: () => clone(ecology) } }]
    ])
  };
  return () => {
    globalThis.game = previous.game;
    globalThis.foundry = previous.foundry;
  };
}

test("valid aquatic compatibility records register and all twelve are retrievable through the base registry", async () => {
  const base = createBaseApi();
  const restore = installRuntime(base);
  try {
    const result = await registerWithBase("aquatic-provider", data.statblocks);
    assert.equal(result.registered, true);
    assert.equal(result.count, 12);
    const registered = base.getStatblocks({ providerId: "aquatic-provider" });
    assert.equal(registered.length, 12);
    assert.deepEqual(new Set(registered.map(record => record.monsterId)), new Set(data.statblocks.map(record => record.id)));
    for (const record of registered) {
      assert.equal(typeof record.hp, "object");
      assert.ok(record.hp.value > 0);
      assert.match(record.hp.formula, /^\d+d\d+/);
    }
  } finally { restore(); }
});

test("base registration waits for asynchronous readiness and is idempotent", async () => {
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const base = createBaseApi({ ready });
  const restore = installRuntime(base);
  try {
    const pending = registerWithBase("aquatic-provider-async", data.statblocks);
    await Promise.resolve();
    assert.equal(base.calls.some(call => call[0] === "register"), false);
    resolveReady();
    const first = await pending;
    const second = await registerWithBase("aquatic-provider-async", data.statblocks);
    assert.equal(first.registered, true);
    assert.equal(second.registered, true);
    assert.equal(base.getStatblocks({ providerId: "aquatic-provider-async" }).length, 12);
  } finally { restore(); }
});

test("provider replacement removes stale aquatic records", async () => {
  const base = createBaseApi();
  const restore = installRuntime(base);
  try {
    await registerWithBase("aquatic-provider-replace", data.statblocks);
    await registerWithBase("aquatic-provider-replace", data.statblocks.slice(0, 2));
    assert.deepEqual(
      base.getStatblocks({ providerId: "aquatic-provider-replace" }).map(record => record.monsterId),
      data.statblocks.slice(0, 2).map(record => record.id)
    );
  } finally { restore(); }
});

test("genuine base rejection yields structured diagnostics while local import remains available", async () => {
  const base = createBaseApi({ reject: true });
  const restore = installRuntime(base);
  try {
    const status = await registerStatblocks("aquatic-provider-fallback", data, { allowLocalFallback: true });
    assert.equal(status.valid, true);
    assert.equal(status.baseRegistered, false);
    assert.equal(status.baseIssues[0].providerId, "aquatic-provider-fallback");
    assert.equal(status.baseIssues[0].recordId, data.statblocks[0].id);
    assert.equal(status.baseIssues[0].rule, "forced-invalid");
    assert.equal(status.baseIssues[0].rolledBack, false);
    assert.equal(status.baseIssues[0].localImportAvailable, true);
    assert.equal(getIntegrationStatus("aquatic-provider-fallback").statblocks, 12);
  } finally { restore(); }
});

test("generated aquatic Actors use only the modern D&D sense range structure", () => {
  for (const record of data.statblocks) {
    const senses = buildActorData(record).system.attributes.senses;
    assert.deepEqual(Object.keys(senses).sort(), ["ranges", "special", "units"]);
    assert.deepEqual(Object.keys(senses.ranges).sort(), ["blindsight", "darkvision", "tremorsense", "truesight"]);
    for (const legacy of ["darkvision", "blindsight", "tremorsense", "truesight"]) assert.equal(Object.hasOwn(senses, legacy), false, `${record.id}: ${legacy}`);
  }
});

test("production sources never access deprecated D&D Actor sense aliases", async () => {
  const files = ["../scripts/builder.mjs", "../scripts/provision.mjs", "../scripts/apps/dashboard.mjs"];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    for (const legacy of ["darkvision", "blindsight", "tremorsense", "truesight"]) {
      assert.doesNotMatch(source, new RegExp(`system\\.attributes\\.senses\\.${legacy}\\b`), `${file}: ${legacy}`);
    }
  }
});

test("aquatic dashboard delegates failure detection to the shared explicit contract", async () => {
  const source = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  assert.match(source, /toolkit\(\)\.operationHasFailures/);
  assert.doesNotMatch(source, /Object\.values\(value\)/);
  assert.doesNotMatch(source, /Object\.entries\(value\)/);
});
