/**
 * Posts with several photos (swipe through them).
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/postService.js");
const controller = read("src/controllers/postController.js");
const users = read("src/services/userService.js");
const migration = read("src/migrations/051_post_media.sql");

test("up to 5 photos, the first stays in posts.media_url", () => {
  assert.match(service, /const MAX_POST_PHOTOS = 5;/);
  assert.match(service, /\.slice\(0, MAX_POST_PHOTOS\)/);
  assert.match(controller, /extra\.length > postService\.MAX_POST_PHOTOS/);
});

test("every photo must be uploaded first", () => {
  assert.match(controller, /extra\.some\(\(url\) => typeof url !== "string"/);
});

test("posts come back with all their photos, in order", () => {
  assert.match(service, /ORDER BY post_id, position/);
  assert.match(service, /media: photos\.get\(row\.id\) \|\| \[row\.media_url\]/);
});

test("the extra photos go with the post, on disk and in the database", () => {
  assert.match(migration, /REFERENCES posts\(id\) ON DELETE CASCADE/);
  assert.match(users, /FROM post_media m JOIN posts p ON p\.id = m\.post_id/);
});
