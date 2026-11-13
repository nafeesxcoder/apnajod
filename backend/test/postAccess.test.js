/**
 * The Instagram rule for posts, with a match in place of a follow.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { postAccess } = require("../src/utils/postAccess");

test("your own posts are always open", () => {
  assert.equal(postAccess({ self: true, blocked: true, isPrivate: true, matched: false }), "open");
});

test("a public account is open to everyone", () => {
  assert.equal(postAccess({ self: false, blocked: false, isPrivate: false, matched: false }), "open");
});

test("a private account is locked until you match", () => {
  assert.equal(postAccess({ self: false, blocked: false, isPrivate: true, matched: false }), "locked");
  assert.equal(postAccess({ self: false, blocked: false, isPrivate: true, matched: true }), "open");
});

test("a block hides posts both ways, even after a match", () => {
  assert.equal(postAccess({ self: false, blocked: true, isPrivate: false, matched: true }), "hidden");
});

const service = fs.readFileSync(path.join(__dirname, "../src/services/postService.js"), "utf8");
const follow = fs.readFileSync(path.join(__dirname, "../src/controllers/followController.js"), "utf8");

test("the server applies the rule, not just the app", () => {
  assert.match(service, /if \(access === "locked"\) return \{ posts: \[\], locked: true/);
  assert.match(service, /if \(access === "hidden"\) return \{ posts: \[\]/);
});

test("a locked profile sends one photo, and no match count anywhere", () => {
  assert.match(follow, /if \(locked\) profile\.photos = profile\.photos\.slice\(0, 1\)/);
  assert.doesNotMatch(follow, /matchCount|matchesCount|matches_count/);
});

test("a deploy never turns public accounts back to private", () => {
  // Migrations re-run on every deploy; an unconditional UPDATE in one would
  // undo every member's privacy choice each time.
  const sql = fs.readFileSync(path.join(__dirname, "../src/migrations/028_private_by_default.sql"), "utf8");
  const statements = sql.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(statements, /UPDATE\s+users\s+SET\s+is_private/i);
});
