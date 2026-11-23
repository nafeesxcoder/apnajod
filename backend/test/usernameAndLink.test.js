/**
 * Username change (free once, then 15 days between changes) and the profile link.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const profile = read("src/services/profileService.js");
const routes = read("src/routes/profileRoutes.js");
const migration = read("src/migrations/079_link_and_username_change.sql");

test("a username change is allowed once freely, then after 15 days", () => {
  const change = profile.slice(profile.indexOf("async function changeUsername("), profile.indexOf("module.exports"));
  assert.match(change, /if \(user\.username_changed_at\) \{/);
  assert.match(change, /if \(daysSince < 15\)/);
  assert.match(change, /status|ApiError\(429/);
  assert.match(change, /UPDATE users SET username = \?, username_changed_at = NOW\(6\)/);
  assert.match(change, /That username is taken\./);
});

test("the link is checked and saved on its own, so other profile fields are not touched", () => {
  const link = profile.slice(profile.indexOf("async function setLink("), profile.indexOf("/**\n * Change your username."));
  assert.match(link, /INSERT INTO profiles \(user_id, link\) VALUES \(\?, \?\) ON DUPLICATE KEY UPDATE link = VALUES\(link\)/);
  assert.doesNotMatch(link, /first_name/);
  assert.match(profile, /new URL\(withScheme\)/);
});

test("both are routes for the signed-in member, and the columns exist", () => {
  assert.match(routes, /router\.put\("\/username", profileController\.changeUsername\);/);
  assert.match(routes, /router\.put\("\/link", profileController\.setLink\);/);
  assert.match(migration, /ALTER TABLE profiles ADD COLUMN link VARCHAR\(255\) NULL;/);
  assert.match(migration, /ALTER TABLE users ADD COLUMN username_changed_at DATETIME\(6\) NULL;/);
});
