/**
 * Likes, comments and saves on posts.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { cleanComment, MAX_COMMENT } = require("../src/services/postSocialService");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/postSocialService.js");
const routes = read("src/routes/postRoutes.js");
const migration = read("src/migrations/047_post_social.sql");

test("a comment is trimmed, keeps at most one blank line, and is capped", () => {
  assert.equal(cleanComment("  hi  "), "hi");
  assert.equal(cleanComment("a\r\n\r\n\r\n\r\nb"), "a\n\nb");
  assert.equal(cleanComment("x".repeat(900)).length, MAX_COMMENT);
  assert.equal(cleanComment(undefined), "");
});

test("every action first checks you may see the post", () => {
  for (const fn of ["like", "unlike", "likers", "comments", "addComment", "deleteComment", "save"]) {
    const body = service.slice(service.indexOf(`async function ${fn}(`));
    const end = body.indexOf("\n}\n");
    assert.match(body.slice(0, end), /requireVisible\(viewerId, postId\)/, fn);
  }
});

test("a post you may not see is 'not found', never 'locked'", () => {
  assert.match(service, /if \(\(await postService\.accessFor\(viewerId, row\.user_id\)\) !== "open"\) throw notFound\(\)/);
});

test("only the writer or the post's owner can delete a comment", () => {
  assert.match(service, /row\.user_id !== viewerId && ownerId !== viewerId/);
});

test("blocked and deleted members are left out of likes and comments", () => {
  assert.match(service, /u\.deleted_at IS NULL AND u\.deactivated_at IS NULL/);
  assert.match(service, /NOT EXISTS \(SELECT 1 FROM blocks b/);
});

test("routes: saved comes before /:id, comments are rate limited", () => {
  assert.ok(routes.indexOf('"/saved"') < routes.indexOf('"/:id"'));
  assert.match(routes, /router\.post\("\/:id\/comments", commentLimiter/);
});

test("likes, comments and saves go with their post", () => {
  assert.equal((migration.match(/REFERENCES posts\(id\) ON DELETE CASCADE/g) || []).length, 3);
  assert.equal((migration.match(/REFERENCES users\(id\) ON DELETE CASCADE/g) || []).length, 3);
});
