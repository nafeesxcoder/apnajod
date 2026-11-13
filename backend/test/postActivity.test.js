/**
 * Notifications and Activity for posts.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const activity = read("src/services/postActivityService.js");
const social = read("src/services/postSocialService.js");
const routes = read("src/routes/postRoutes.js");
const migration = read("src/migrations/050_post_activity.sql");

test("a new like and every comment notify the post's owner", () => {
  assert.match(social, /if \(result\.affectedRows\) \{\n\s+require\("\.\/postActivityService"\)\.notifyLike\(viewerId, postId, ownerId\)/);
  assert.match(social, /notifyComment\(viewerId, postId, ownerId, text\)/);
});

test("never a notification about yourself, or across a block", () => {
  for (const fn of ["notifyLike", "notifyComment"]) {
    const body = activity.slice(activity.indexOf(`async function ${fn}(`));
    assert.match(body.slice(0, 400), /if \(!ownerId \|\| actorId === ownerId\) return/);
    assert.match(body.slice(0, 400), /if \(await blockedBetween\(actorId, ownerId\)\) return/);
  }
});

test("likes push at most once an hour per post, claimed atomically", () => {
  assert.match(activity, /LIKE_PUSH_GAP_MS = 60 \* 60 \* 1000/);
  assert.match(activity, /UPDATE posts SET like_push_at = NOW\(6\)\s+WHERE id = \? AND \(like_push_at IS NULL OR like_push_at < NOW\(6\) - INTERVAL \? SECOND\)/);
  assert.match(activity, /if \(!claim\.affectedRows\) return \{ sent: false, reason: "recent" \}/);
});

test("the push carries the post, so tapping it opens that post", () => {
  assert.match(activity, /postId,\n\s+\}\);/);
});

test("Activity leaves out yourself, blocks and gone accounts, and knows what is new", () => {
  assert.match(activity, /u\.id <> \? AND u\.deleted_at IS NULL AND u\.deactivated_at IS NULL/);
  assert.match(activity, /isNew: new Date\(row\.at\)\.getTime\(\) > seenAt/);
  assert.match(migration, /ALTER TABLE users ADD COLUMN activity_seen_at DATETIME\(6\) NULL;/);
  assert.match(migration, /ALTER TABLE posts ADD COLUMN like_push_at DATETIME\(6\) NULL;/);
});

test("the activity routes come before /:id", () => {
  for (const route of ['"/activity"', '"/activity/unread"', '"/activity/seen"']) {
    assert.ok(routes.indexOf(route) > 0 && routes.indexOf(route) < routes.indexOf('"/:id"'), route);
  }
});
