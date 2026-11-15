const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * Replies to comments: a reply sits under the top comment (one level), the
 * one answered gets "replied to your comment", the post's owner gets
 * "commented" (never both), and deleting a comment takes its replies.
 */
function load({ comments }) {
  const sqls = [];
  const notes = [];
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") {
      return {
        query: async (sql, params) => {
          sqls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
          if (/SELECT user_id FROM posts WHERE id/.test(sql)) return [{ user_id: "owner" }];
          if (/SELECT c\.id, c\.parent_id, c\.user_id FROM post_comments/.test(sql)) return comments.filter((c) => c.id === params[0]);
          if (/SELECT user_id FROM post_comments WHERE id/.test(sql)) return [{ user_id: "me" }];
          return [];
        },
      };
    }
    if (id === "./postService") return { accessFor: async () => "open", decoratePosts: async () => [{}] };
    return original.apply(this, arguments);
  };
  // Loaded late inside the service, so it is put in the cache up front.
  const activityPath = require.resolve("../src/services/postActivityService");
  require.cache[activityPath] = {
    id: activityPath,
    filename: activityPath,
    loaded: true,
    exports: {
      notifyReply: async (...args) => notes.push(["reply", ...args]),
      notifyComment: async (...args) => notes.push(["comment", ...args]),
    },
  };
  try {
    delete require.cache[require.resolve("../src/services/postSocialService")];
    return { social: require("../src/services/postSocialService"), sqls, notes };
  } finally {
    Module.prototype.require = original;
  }
}

const insertOf = (sqls) => sqls.find((s) => s.sql.startsWith("INSERT INTO post_comments"));

test("a reply to a comment sits under it and tells its writer, and the post's owner", async () => {
  const { social, sqls, notes } = load({ comments: [{ id: "c1", parent_id: null, user_id: "sana" }] });
  await social.addComment("me", "p1", "Sahi kaha!", "c1");
  const insert = insertOf(sqls);
  assert.deepEqual(insert.params.slice(4), ["c1", "sana"]);
  assert.deepEqual(notes.map((n) => n.slice(0, 4)), [["reply", "me", "p1", "sana"], ["comment", "me", "p1", "owner"]]);
});

test("a reply to a reply goes under the same top comment", async () => {
  const { social, sqls } = load({ comments: [{ id: "r1", parent_id: "c1", user_id: "riya" }] });
  await social.addComment("me", "p1", "@riya haan", "r1");
  assert.deepEqual(insertOf(sqls).params.slice(4), ["c1", "riya"]);
});

test("replying to the owner's own comment sends them one notification, not two", async () => {
  const { social, notes } = load({ comments: [{ id: "c1", parent_id: null, user_id: "owner" }] });
  await social.addComment("me", "p1", "Thanks", "c1");
  assert.deepEqual(notes.map((n) => n[0]), ["reply"]);
});

test("replying to yourself notifies nobody but the owner; a plain comment is not a reply", async () => {
  const self = load({ comments: [{ id: "c1", parent_id: null, user_id: "me" }] });
  await self.social.addComment("me", "p1", "and also", "c1");
  assert.deepEqual(self.notes.map((n) => n[0]), ["comment"]);
  const plain = load({ comments: [] });
  await plain.social.addComment("me", "p1", "Nice");
  assert.deepEqual(insertOf(plain.sqls).params.slice(4), [null, null]);
});

test("a reply to a comment that is gone is refused", async () => {
  const { social } = load({ comments: [] });
  await assert.rejects(social.addComment("me", "p1", "hi", "missing"), /not there any more/);
});

test("deleting a comment takes its replies with it", async () => {
  const { social, sqls } = load({ comments: [] });
  await social.deleteComment("me", "p1", "c1");
  const del = sqls.find((s) => s.sql.startsWith("DELETE FROM post_comments"));
  assert.match(del.sql, /\(id = \? OR parent_id = \?\)/);
  assert.deepEqual(del.params, ["p1", "c1", "c1"]);
});

test("replies show in Activity for the one answered, and the migration adds the columns", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const activity = fs.readFileSync(path.join(__dirname, "../src/services/postActivityService.js"), "utf8");
  assert.match(activity, /SELECT 'reply' AS kind/);
  assert.match(activity, /Array\(5 \* 4 \+ 5\)/);
  const sql = fs.readFileSync(path.join(__dirname, "../src/migrations/068_comment_replies.sql"), "utf8");
  assert.match(sql, /ADD COLUMN parent_id CHAR\(36\) NULL;/);
  assert.match(sql, /ADD COLUMN reply_to_user_id CHAR\(36\) NULL;/);
});
