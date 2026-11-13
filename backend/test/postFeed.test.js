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

test("shows public accounts, and private ones only once you have matched", () => {
  assert.match(feed, /u\.is_private = 0\s+OR EXISTS \(SELECT 1 FROM mutual_matches/);
});

test("leaves out your own posts, blocks both ways, gone accounts and under-18s", () => {
  assert.match(feed, /p\.user_id <> \?/);
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
