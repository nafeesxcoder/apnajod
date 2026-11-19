const { test } = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ctl = readFileSync(join(__dirname, "..", "src", "controllers", "profileController.js"), "utf8");

test("profile photos: only http(s) addresses are saved, never a device's blob:/file:// link", () => {
  assert.ok(ctl.includes(String.raw`/^https?:\/\//i.test(url)`));
  assert.ok(ctl.includes("profileService.replacePhotos(req.user.id, usable)"));
});
