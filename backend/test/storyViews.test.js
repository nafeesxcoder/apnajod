/**
 * "Seen by" on your own story, and the story notifications.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const sticker = read("src/services/storyStickerService.js");
const stories = read("src/services/storyService.js");
const migration = read("src/migrations/059_story_views.sql");

test("a view is deleted with the story", () => {
  assert.match(migration, /REFERENCES stories\(id\) ON DELETE CASCADE/);
  for (const line of migration.split("\n")) if (line.trim().startsWith("--")) assert.doesNotMatch(line, /;/);
});

test("only people who may see the story are counted, never the owner", () => {
  const fn = sticker.slice(sticker.indexOf("async function view("), sticker.indexOf("async function withLikes"));
  assert.match(fn, /visibleStory\(viewerId, storyId\)/);
  assert.match(fn, /story\.user_id === viewerId\) return \{ seen: false \}/);
  assert.match(read("src/routes/storyRoutes.js"), /router\.post\('\/:id\/view'/);
});

test("the owner sees who saw it, nobody else", () => {
  const fn = sticker.slice(sticker.indexOf("async function responses("));
  assert.match(fn, /WHERE id = \? AND user_id = \? AND expires_at > NOW\(6\)/);
  assert.match(fn, /FROM story_views v/);
});

test("story likes, mentions and close-friends stories notify, and open the stories", () => {
  assert.match(sticker, /liked your story`, storyUserId: story\.user_id/);
  assert.match(sticker, /likePushed\.has\(key\)/);
  assert.match(sticker, /mentioned you in their story`, storyUserId: posterId/);
  assert.match(stories, /shared a story with close friends`, storyUserId: userId/);
  // Several close-friends stories in an hour send one notification, never across a block.
  assert.match(stories, /created_at > NOW\(6\) - INTERVAL 1 HOUR/);
  assert.match(stories.slice(stories.indexOf("async function notifyCloseFriends")), /FROM blocks b/);
});
