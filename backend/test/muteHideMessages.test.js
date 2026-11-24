/**
 * Mute, hiding a story from someone, and who may message you.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const follow = read("src/services/followService.js");
const visibility = read("src/services/storyVisibility.js");
const postService = read("src/services/postService.js");
const storyService = read("src/services/storyService.js");

test("muted people leave the feed and the stories tray", () => {
  assert.match(postService, /NOT EXISTS \(SELECT 1 FROM muted_accounts ma WHERE ma\.user_id = \? AND ma\.muted_id = p\.user_id\)/);
  assert.match(storyService, /NOT EXISTS \(SELECT 1 FROM muted_accounts ma WHERE ma\.user_id = \? AND ma\.muted_id = u\.id\)/);
});

test("a story hidden from someone is not visible to them", () => {
  assert.match(visibility, /AND NOT EXISTS \(SELECT 1 FROM story_hidden h WHERE h\.owner_id = s\.user_id AND h\.viewer_id = \?\)/);
  assert.match(visibility, /const visibleParams = \(viewerId\) => \[viewerId, viewerId, viewerId, viewerId, viewerId, viewerId\];/);
});

test("the hide-story list shows each person's photo", () => {
  assert.match(storyService, /async function hiddenList[\s\S]*profile_photos[\s\S]*AS avatarUrl/);
});

test("who may message you: matches only, or everyone (private accounts still need a match)", () => {
  assert.match(follow, /if \(!other\.is_private && other\.message_from !== "matches"\) return \{ allowed: true, reason: "public" \};/);
  assert.match(follow, /u\.is_private, u\.message_from/);
});
