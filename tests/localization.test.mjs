import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { localizeContent, localizeKey } from "../scripts/localization.mjs";

const en = JSON.parse(await readFile(new URL("../lang/en.json", import.meta.url), "utf8"));
const de = JSON.parse(await readFile(new URL("../lang/de.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../module.json", import.meta.url), "utf8"));

test("Foundry manifest declares modular English and German dictionaries", () => {
  assert.deepEqual(manifest.languages, [
    { lang: "en", name: "English", path: "lang/en.json" },
    { lang: "de", name: "Deutsch", path: "lang/de.json" }
  ]);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
});

test("content localization delegates to the active Foundry i18n service", () => {
  const previous = globalThis.game;
  globalThis.game = { i18n: { lang: "de", localize: key => de[key] ?? key } };
  try {
    assert.equal(localizeKey("HBAEDND.Title"), de["HBAEDND.Title"]);
    const key = Object.keys(de).find(entry => entry.startsWith("HBAEDND.Content."));
    assert.equal(localizeContent(key), de[key]);
    assert.equal(localizeContent("Campaign-authored text"), "Campaign-authored text");
  } finally { globalThis.game = previous; }
});

test("every dashboard and source localization key resolves from each bundled dictionary", async () => {
  const sources = await Promise.all([
    "../templates/dashboard.hbs", "../scripts/apps/dashboard.mjs", "../scripts/settings.mjs",
    "../scripts/api.mjs", "../scripts/provision.mjs", "../scripts/builder.mjs"
  ].map(async path => readFile(new URL(path, import.meta.url), "utf8")));
  const keys = new Set(sources.flatMap(source => [...source.matchAll(/HBAEDND\.[A-Za-z0-9_.-]+/g)].map(match => match[0])));
  for (const [language, dictionary] of [["en", en], ["de", de]]) {
    for (const key of keys) assert.equal(typeof dictionary[key], "string", `${language}: ${key}`);
  }
});

test("shipped stat-block content contains keys rather than embedded language maps", async () => {
  const data = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8"));
  const inline = [];
  const keys = [];
  const walk = (value, path = "$") => {
    if (Array.isArray(value)) return value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    if (!value || typeof value !== "object") {
      if (typeof value === "string" && value.startsWith("HBAEDND.Content.")) keys.push([path, value]);
      return;
    }
    if (Object.hasOwn(value, "en") || Object.hasOwn(value, "de")) inline.push(path);
    for (const [key, entry] of Object.entries(value)) walk(entry, `${path}.${key}`);
  };
  walk(data);
  assert.deepEqual(inline, []);
  assert.ok(keys.length > 100);
  for (const [path, key] of keys) {
    assert.equal(typeof en[key], "string", `${path}: English missing ${key}`);
    assert.equal(typeof de[key], "string", `${path}: German missing ${key}`);
  }
});
