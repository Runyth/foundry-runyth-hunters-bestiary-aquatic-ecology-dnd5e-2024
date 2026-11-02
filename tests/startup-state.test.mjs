import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../scripts/main.mjs", import.meta.url), "utf8");

test("startup failures are kept outside the frozen public API", () => {
  assert.match(source, /const startupFailures = \[\];/);
  assert.match(source, /startupFailures\.length = 0/);
  assert.match(source, /const failures = \[\.\.\.startupFailures\]/);
  assert.doesNotMatch(source, /api\._startupFailures/);
});
