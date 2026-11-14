/**
 * The Home bell: a count of likes since Notifications was last opened.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/matchService.js");
const routes = read("src/routes/matchRoutes.js");
const migration = read("src/migrations/056_notifications_seen.sql");

test("the bell counts likes since it was last opened, last 30 days only", () => {
  const fn = service.slice(service.indexOf("async function notificationCount"));
  assert.match(fn, /d\.updated_at > me\.notifications_seen_at/);
  assert.match(fn, /INTERVAL \$\{NOTIFICATION_DAYS\} DAY/);
  assert.match(service, /const NOTIFICATION_DAYS = 30;/);
  assert.match(fn, /blocks b/);
});

test("opening Notifications clears the count", () => {
  assert.match(service, /SET notifications_seen_at = NOW\(6\)/);
  assert.match(routes, /router\.get\("\/notifications"/);
  assert.match(routes, /router\.post\("\/notifications\/seen"/);
});

test("the migration re-runs safely", () => {
  assert.match(migration, /ADD COLUMN notifications_seen_at/);
  for (const line of migration.split("\n")) if (line.trim().startsWith("--")) assert.doesNotMatch(line, /;/);
});
