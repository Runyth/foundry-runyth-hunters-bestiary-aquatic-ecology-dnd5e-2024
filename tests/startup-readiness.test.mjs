import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { waitForDependencyApi, waitForDependencies } from "../scripts/startup.mjs";

function installModules(entries) {
  const previous = globalThis.game;
  globalThis.game = { modules: new Map(entries) };
  return () => { globalThis.game = previous; };
}

test("active dependencies may expose their readiness API after this module's ready hook begins", async () => {
  const dependency = { active: true, api: null };
  const restore = installModules([["late-module", dependency]]);
  let clock = 0;
  try {
    const waiting = waitForDependencyApi("late-module", {
      timeoutMs: 100,
      pollIntervalMs: 1,
      now: () => clock,
      delay: async () => {
        clock += 1;
        dependency.api = { whenReady: async () => ({ ready: true, failures: [] }) };
      }
    });
    assert.equal(await waiting, dependency);
  } finally { restore(); }
});

test("dependency readiness is awaited concurrently and accepts late Aquatic Ecology completion", async () => {
  let resolveCore;
  let resolveBase;
  let resolveEcology;
  const coreReady = new Promise(resolve => { resolveCore = resolve; });
  const baseReady = new Promise(resolve => { resolveBase = resolve; });
  const ecologyReady = new Promise(resolve => { resolveEcology = resolve; });
  const modules = [
    ["core", { active: true, api: { initializationStatus: { ready: false }, whenReady: () => coreReady } }],
    ["base", { active: true, api: { initializationStatus: { ready: false }, whenReady: () => baseReady } }],
    ["ecology", { active: true, api: { getStatus: () => ({ ready: true, failures: [] }), whenReady: () => ecologyReady } }]
  ];
  const restore = installModules(modules);
  try {
    const pending = waitForDependencies(["core", "base", "ecology"]);
    await Promise.resolve();
    resolveEcology({ ready: true, failures: [] });
    await Promise.resolve();
    let settled = false;
    pending.then(() => { settled = true; });
    await Promise.resolve();
    assert.equal(settled, false, "must still wait for the other dependencies");
    modules[0][1].api.initializationStatus = { ready: true, ok: true, failures: [] };
    modules[1][1].api.initializationStatus = { ready: true, ok: true, failures: [] };
    resolveCore(modules[0][1].api);
    resolveBase(modules[1][1].api);
    const ready = await pending;
    assert.equal(ready.length, 3);
  } finally { restore(); }
});

test("a dependency that genuinely completed startup with failures is still rejected", async () => {
  const dependency = {
    active: true,
    api: {
      initializationStatus: { ready: true, ok: false, failures: [{ message: "forced failure" }] },
      whenReady: async function () { return this; }
    }
  };
  const restore = installModules([["broken-module", dependency]]);
  try {
    await assert.rejects(waitForDependencies(["broken-module"]), /forced failure/);
  } finally { restore(); }
});

test("startup no longer permanently rejects a transiently missing dependency API", async () => {
  const source = await readFile(new URL("../scripts/main.mjs", import.meta.url), "utf8");
  assert.match(source, /waitForDependencies\(\[CORE_ID, BASE_DND_ID, ECOLOGY_ID\]\)/);
  assert.doesNotMatch(source, /inactive or lacks its public API/);
});
