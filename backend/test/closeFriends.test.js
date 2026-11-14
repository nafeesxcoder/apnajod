/**
 * Close friends: a list each member keeps, and stories only that list sees.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const visibility = read("src/services/storyVisibility.js");
const stories = read("src/services/storyService.js");
const stickers = read("src/services/storyStickerService.js");
const service = read("src/services/closeFriendsService.js");
const migration = read("src/migrations/058_close_friends.sql");

test("a close-friends story is seen only by the owner's list", () => {
  assert.match(visibility, /s\.audience = 'close'\s+AND EXISTS \(SELECT 1 FROM close_friends cf WHERE cf\.owner_id = s\.user_id AND cf\.friend_id = \?\)/);
  // Public accounts, matches and mentions only open the other stories.
  assert.match(visibility, /s\.audience <> 'close'\s+AND \(u\.is_private = 0/);
  const { visibleParams } = require("../src/services/storyVisibility");
  assert.equal((visibility.match(/\?/g) || []).length, visibleParams("x").length);
});

test("the tray and likes, votes and answers all use the same rule", () => {
  assert.match(stories, /AND \$\{VISIBLE_TO_VIEWER\}/);
  assert.match(stickers, /AND \$\{VISIBLE_TO_VIEWER\}/);
});

test("sharing to close friends needs a list, and mentions stay inside it", () => {
  assert.match(stories, /Add people to your Close friends list first\./);
  assert.match(stories, /closeIds\.has\(sticker\.userId\)/);
});

test("only matches and follows can be added, nobody is told", () => {
  assert.match(service, /FROM mutual_matches mm/);
  assert.match(service, /f\.status = 'accepted'/);
  assert.doesNotMatch(service, /notifyUser|pushService/);
});

test("the migration re-runs safely", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS close_friends/);
  assert.match(migration, /ALTER TABLE stories ADD COLUMN audience/);
  for (const line of migration.split("\n")) if (line.trim().startsWith("--")) assert.doesNotMatch(line, /;/);
});
