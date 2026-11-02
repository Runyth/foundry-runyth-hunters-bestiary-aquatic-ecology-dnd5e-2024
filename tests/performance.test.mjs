import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { clearStatblockDataCache, loadStatblockData } from "../scripts/data.mjs";

test("concurrent stat-block data requests share one browser fetch", async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  clearStatblockDataCache();
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    assert.equal(options.cache, "default");
    await new Promise(resolve => setTimeout(resolve, 3));
    return { ok: true, json: async () => ({ statblocks: [] }) };
  };
  try {
    const [a, b] = await Promise.all([loadStatblockData(), loadStatblockData()]);
    assert.equal(calls, 1);
    assert.equal(a, b);
  } finally {
    clearStatblockDataCache();
    globalThis.fetch = previousFetch;
  }
});

test("startup waits for independent dependencies concurrently", async () => {
  const source = await readFile(new URL("../scripts/startup.mjs", import.meta.url), "utf8");
  assert.match(source, /Promise\.all\(ids\.map/);
  assert.match(source, /Promise\.all\(dependencies\.map/);
  assert.doesNotMatch(source, /for \(const dependency of dependencies\)[\s\S]{0,300}await dependency\.api\.whenReady/);
});
