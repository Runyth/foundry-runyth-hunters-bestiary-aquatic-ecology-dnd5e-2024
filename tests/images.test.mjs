import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildActorData } from "../scripts/builder.mjs";

test("all aquatic stat blocks declare a packaged image", async () => {
  const data = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8"));
  for (const record of data.statblocks) assert.match(record.img, /^modules\/hunters-bestiary-aquatic-ecology\//);
});

test("Actor portrait and prototype token use the same record image", async () => {
  const data = JSON.parse(await readFile(new URL("../data/statblocks.json", import.meta.url), "utf8"));
  const actor = buildActorData(data.statblocks[0]);
  assert.equal(actor.img, data.statblocks[0].img);
  assert.equal(actor.prototypeToken.texture.src, data.statblocks[0].img);
});

test("dashboard delegates image changes to Hunter's Bestiary core", async () => {
  const source = await readFile(new URL("../scripts/apps/dashboard.mjs", import.meta.url), "utf8");
  const template = await readFile(new URL("../templates/dashboard.hbs", import.meta.url), "utf8");
  assert.match(source, /openMonsterImagePicker/);
  assert.match(source, /getMonsterImage/);
  assert.match(template, /data-action="hbaedndChangeImage"/);
});
