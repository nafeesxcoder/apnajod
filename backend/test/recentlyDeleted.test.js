/**
 * Recently deleted posts and archived stories: kept 30 days, then gone for good.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const posts = read("src/services/postService.js");
const stories = read("src/services/storyService.js");
const routes = read("src/routes/postRoutes.js");
const storyRoutes = read("src/routes/storyRoutes.js");
const migration = read("src/migrations/077_recently_deleted_and_archive.sql");

test("a deleted post is kept, not removed, until 30 days have passed", () => {
  const del = posts.slice(posts.indexOf("async function deletePost("), posts.indexOf("async function listDeletedPosts("));
  assert.match(del, /UPDATE posts SET deleted_at = NOW\(6\)/);
  assert.doesNotMatch(del, /DELETE FROM posts/);
  assert.match(posts, /INTERVAL \? DAY LIMIT \?/);
  assert.match(posts, /\[days, batch\]/);
  assert.match(posts, /purgeDeletedPosts\(days = 30/);
});

test("deleted posts are hidden everywhere a post is read", () => {
  assert.match(posts, /FROM \(SELECT \* FROM posts WHERE deleted_at IS NULL\) p/);
  assert.match(posts, /SELECT COUNT\(\*\) AS n FROM posts WHERE user_id = \? AND deleted_at IS NULL/);
});

test("you can restore a post from Recently deleted", () => {
  assert.match(posts, /UPDATE posts SET deleted_at = NULL WHERE id = \? AND user_id = \? AND deleted_at IS NOT NULL/);
  assert.match(routes, /router\.post\("\/deleted\/:id\/restore"/);
  assert.ok(routes.indexOf('"/deleted"') < routes.indexOf('"/:id"'));
});

test("a story past its 24 hours is archived, then removed after 30 days", () => {
  const purge = stories.slice(stories.indexOf("async function purgeExpired("), stories.indexOf("/** Your archived stories"));
  assert.match(purge, /UPDATE stories SET archived_at = NOW\(6\) WHERE expires_at <= NOW\(6\)/);
  assert.match(purge, /archived_at < NOW\(6\) - INTERVAL \? DAY/);
  assert.match(stories, /const ARCHIVE_DAYS = 30;/);
});

test("the archive is only yours, and a photo still in it is never swept as a leftover", () => {
  const list = stories.slice(stories.indexOf("async function listArchived("), stories.indexOf("/** Shares an archived story"));
  assert.match(list, /WHERE user_id = \? AND archived_at IS NOT NULL/);
  assert.match(stories, /if \(kept\.has\(name\)\) continue;/);
});

test("an archived story can be shared again, with its own copy of the photo", () => {
  const repost = stories.slice(stories.indexOf("async function repostArchived("), stories.indexOf("/** Removes one archived story"));
  assert.match(repost, /copyFile/);
  assert.match(repost, /NOW\(6\) \+ INTERVAL \? HOUR/);
  assert.match(storyRoutes, /router\.post\('\/archive\/:id\/repost'/);
  assert.match(storyRoutes, /router\.delete\('\/archive\/:id'/);
});

test("the migration adds the two columns and the purge job runs at start", () => {
  assert.match(migration, /ALTER TABLE posts ADD COLUMN deleted_at DATETIME\(6\) NULL;/);
  assert.match(migration, /ALTER TABLE stories ADD COLUMN archived_at DATETIME\(6\) NULL;/);
  assert.match(read("src/server.js"), /require\('\.\/jobs\/cleanupDeletedPosts'\)\.start\(\);/);
});

test("a story you delete waits 30 days in Recently deleted, then goes for good", () => {
  const rm = stories.slice(stories.indexOf("async function remove("), stories.indexOf("/** Your deleted stories"));
  assert.match(rm, /UPDATE stories SET deleted_at = NOW\(6\), expires_at = NOW\(6\)/);
  assert.doesNotMatch(rm, /DELETE FROM stories/);
  assert.match(stories, /OR \(deleted_at IS NOT NULL AND deleted_at < NOW\(6\) - INTERVAL \? DAY\)/);
  assert.match(storyRoutes, /router\.get\('\/deleted'/);
  assert.match(storyRoutes, /router\.post\('\/deleted\/:id\/restore'/);
});

test("restoring a deleted story puts it in your archive", () => {
  const restore = stories.slice(stories.indexOf("async function restoreDeleted("), stories.indexOf("/** Your archived stories"));
  assert.match(restore, /SET deleted_at = NULL, archived_at = NOW\(6\)/);
});

