/**
 * Story hearts, Activity for stories, and passed profiles coming back.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const sticker = read("src/services/storyStickerService.js");
const activity = read("src/services/postActivityService.js");
const migration = read("src/migrations/057_story_likes.sql");
const routes = read("src/routes/storyRoutes.js");

test("a story like is deleted with the story", () => {
  assert.match(migration, /REFERENCES stories\(id\) ON DELETE CASCADE/);
  for (const line of migration.split("\n")) if (line.trim().startsWith("--")) assert.doesNotMatch(line, /;/);
});

test("anyone who can see the story can like it, never their own", () => {
  const fn = sticker.slice(sticker.indexOf("async function like("), sticker.indexOf("async function withLikes"));
  assert.match(fn, /visibleStory\(viewerId, storyId\)/);
  assert.match(fn, /story\.user_id === viewerId/);
  assert.match(routes, /router\.post\('\/:id\/like'/);
});

test("Activity shows story likes, answers and mentions, posts from the last 30 days", () => {
  for (const kind of ["'story_like'", "'story_answer'", "'mention'"]) assert.ok(activity.includes(kind), kind);
  assert.match(activity, /const ACTIVITY_DAYS = 30;/);
  assert.match(activity, /s\.expires_at > NOW\(6\)/);
  // Both the list and the counter come from the same events.
  assert.match(activity, /SELECT \* FROM \(\$\{EVENTS\}\)/);
  assert.match(activity, /SELECT COUNT\(\*\) AS n FROM \(\$\{EVENTS\}\)/);
});

test("a pass comes back after 14 days", () => {
  assert.equal(require("../src/services/profileService").PASS_RETURN_DAYS, 14);
});
