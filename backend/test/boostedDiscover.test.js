const { test } = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const src = readFileSync(join(__dirname, "..", "src", "services", "profileService.js"), "utf8");

test("discover sends a boosted flag with each member", () => {
  assert.ok(src.includes("AS boosted"));
  assert.ok(src.includes("boosted: Number(candidate.boosted) === 1,"));
});
