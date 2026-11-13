/**
 * Reported posts: a moderator sees the photo and removes or keeps the post.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const safety = read("src/services/safetyService.js");
const posts = read("src/services/postService.js");
const routes = read("src/routes/adminRoutes.js");
const migration = read("src/migrations/049_report_post.sql");

test("a report can say which post it is about", () => {
  assert.match(migration, /ALTER TABLE reports ADD COLUMN post_id CHAR\(36\) NULL;/);
  assert.match(safety, /INSERT IGNORE INTO reports \(id, reporter_id, reported_id, reason, details, post_id\)/);
});

test("one member reporting the same post again is still one report", () => {
  assert.match(safety, /\$\{post \? "post_id = \?" : "post_id IS NULL"\}/);
});

test("the queue lists each account's reported posts with the photo", () => {
  assert.match(safety, /reported_posts: posts/);
  assert.match(safety, /SELECT r\.reported_id, r\.post_id, p\.media_url, p\.caption/);
});

test("removing a post deletes it and its photo, closes its reports and tells the owner", () => {
  const fn = posts.slice(posts.indexOf("async function removePostByAdmin"), posts.indexOf("async function keepPostByAdmin"));
  assert.match(fn, /DELETE FROM posts WHERE id = \?/);
  assert.match(fn, /removeMediaFile\(post\.media_url\)/);
  assert.match(fn, /review_status = 'actioned'/);
  assert.match(fn, /notifyUser\(post\.user_id/);
});

test("keeping a post closes its reports as dismissed", () => {
  assert.match(posts, /UPDATE reports SET review_status = 'dismissed'.*WHERE post_id = \?/);
});

test("a member deleting their own post also deletes its photo now", () => {
  const fn = posts.slice(posts.indexOf("async function deletePost"), posts.indexOf("async function removePostByAdmin"));
  assert.match(fn, /await removeMediaFile\(post\.media_url\)/);
});

test("only admins can remove or keep posts", () => {
  const guard = routes.indexOf("router.use(requireAdmin)");
  assert.ok(guard > 0 && guard < routes.indexOf('"/posts/:id/remove"'));
  assert.ok(guard < routes.indexOf('"/posts/:id/keep"'));
});
