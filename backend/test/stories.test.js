/**
 * Stories: up for 24 hours, then deleted - row and photo - with nothing kept.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/storyService.js");
const job = read("src/jobs/cleanupStories.js");
const server = read("src/server.js");
const migration = read("src/migrations/052_stories.sql");
const { storyFilePath, STORY_HOURS, MAX_STORIES_PER_DAY } = require("../src/services/storyService");

test("a story lasts 24 hours and there is a daily cap", () => {
  assert.equal(STORY_HOURS, 24);
  assert.equal(MAX_STORIES_PER_DAY, 10);
  assert.match(service, /NOW\(6\) \+ INTERVAL \$\{STORY_HOURS\} HOUR/);
});

test("an expired story is never shown, even before the cleanup runs", () => {
  assert.match(service, /WHERE s\.expires_at > NOW\(6\)/);
});

test("the cleanup deletes the photo file and the row, then sweeps leftover files", () => {
  const purge = service.slice(service.indexOf("async function purgeExpired"));
  assert.match(purge, /removeFile\(storyFilePath\(story\.media_url, dir\)\)/);
  assert.match(purge, /DELETE FROM stories WHERE id IN/);
  assert.match(purge, /stat\.mtimeMs < cutoff/);
});

test("the cleanup runs at start and every 15 minutes", () => {
  assert.match(job, /everyMs = 15 \* 60 \* 1000/);
  assert.match(server, /require\('\.\/jobs\/cleanupStories'\)\.start\(\)/);
});

test("nothing else is stored: no views table, rows go with the account", () => {
  assert.doesNotMatch(migration, /story_views|viewed/i);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE CASCADE/);
});

test("a story URL maps only to a file inside the stories folder", () => {
  const dir = path.join(os.tmpdir(), "stories");
  assert.equal(storyFilePath("https://apnajoda.com/api/uploads/stories/abc.jpg", dir), path.join(dir, "abc.jpg"));
  assert.equal(storyFilePath("https://apnajoda.com/api/uploads/photos/abc.jpg", dir), null);
  assert.equal(storyFilePath("https://x/uploads/stories/../../etc/passwd", dir), null);
  assert.equal(storyFilePath("https://x/uploads/stories/.env", dir), null);
});

test("who sees a story follows the post rule (public, or matched; never a block)", () => {
  // The rule lives in storyVisibility.js, shared with likes, votes and answers.
  const visibility = fs.readFileSync(path.join(__dirname, "..", "src/services/storyVisibility.js"), "utf8");
  assert.match(service, /AND \$\{VISIBLE_TO_VIEWER\}/);
  assert.match(visibility, /u\.is_private = 0\s+OR EXISTS \(SELECT 1 FROM mutual_matches/);
  assert.match(service, /NOT EXISTS \(SELECT 1 FROM blocks b/);
});
