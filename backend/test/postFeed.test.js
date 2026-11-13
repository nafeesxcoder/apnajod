/**
 * The Home feed: public accounts and your matches, like Instagram's.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const service = fs.readFileSync(path.join(__dirname, "../src/services/postService.js"), "utf8");
const routes = fs.readFileSync(path.join(__dirname, "../src/routes/postRoutes.js"), "utf8");
const feed = service.slice(service.indexOf("async function getFeed("), service.indexOf("/** One post, if the viewer"));

test("shows your own posts, public accounts, and private ones only once you have matched", () => {
  assert.match(feed, /p\.user_id = \?\s+OR u\.is_private = 0\s+OR EXISTS \(SELECT 1 FROM mutual_matches/);
});

test("accounts are public by default, and everyone is made public once", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../src/migrations/048_public_by_default.sql"), "utf8");
  assert.match(sql, /ALTER TABLE users ALTER COLUMN is_private SET DEFAULT 0;/);
  // Guarded so the re-run on every deploy never undoes a later choice.
  assert.match(sql, /AND NOT EXISTS \(SELECT 1 FROM one_time_jobs WHERE name = '048_everyone_public'\)/);
  assert.match(sql, /INSERT IGNORE INTO one_time_jobs \(name\) VALUES \('048_everyone_public'\)/);
  // 048 sorts after 028, so the public default wins.
  assert.ok("048_public_by_default.sql" > "028_private_by_default.sql");
});

test("leaves out blocks both ways, gone accounts and under-18s", () => {
  assert.match(feed, /NOT EXISTS \(SELECT 1 FROM blocks b/);
  assert.match(feed, /u\.deleted_at IS NULL AND u\.deactivated_at IS NULL/);
  assert.match(feed, /pr\.age IS NULL OR pr\.age >= 18/);
});

test("pages newest first by time, ignoring a cursor that is not a timestamp", () => {
  assert.match(feed, /ORDER BY p\.created_at DESC, p\.id DESC/);
  assert.match(feed, /CURSOR\.test\(before\) \? before : null/);
  assert.match(feed, /Math\.min\(30,/);
});

test("the feed route comes before /:id", () => {
  assert.ok(routes.indexOf('"/feed"') < routes.indexOf('"/:id"'));
});
