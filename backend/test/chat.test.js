/**
 * Direct messaging: permission, storage and the conversation list.
 *
 * The storage key matters more than it looks. A conversation is addressed by
 * the other person's user id, so if that is also what it is stored under then
 * each side writes under a different id and neither sees the other's messages
 * after a reload. These tests pin the pair key that fixes it.
 *
 * Permission is now gated by a MUTUAL MATCH — follows no longer grant message
 * rights. sendMessage() should refuse anyone who has not matched, with a
 * generic 403 ("This conversation is not available.") so an attacker cannot
 * tell whether the reason is no-match, block, or not-found.
 *
 * Like follow.test.js these run against a real MySQL and skip with a reason
 * when none is reachable.
 */
const assert = require("node:assert/strict");
const { test, before, beforeEach, after } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";
process.env.DB_NAME = process.env.TEST_DB_NAME || "milaan_test";

const mysql = require("mysql2/promise");
const env = require("../src/config/env");

let available = false;
let skipReason = "";
let chatService;
let followService;
let query;

before(async () => {
  const { host, port, user, password, database } = env.db;
  let admin;
  try {
    admin = await mysql.createConnection({ host, port, user, password });
  } catch (error) {
    skipReason =
      error.code === "ECONNREFUSED"
        ? `no MySQL on ${host}:${port}`
        : `cannot connect as ${user}: ${error.code || error.message}`;
    return;
  }
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (error) {
    skipReason = `cannot create ${database}: ${error.code || error.message}`;
    await admin.end();
    return;
  }
  await admin.end();

  const dir = path.join(__dirname, "..", "src", "migrations");
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });
  for (const file of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = fs
      .readFileSync(path.join(dir, file), "utf8")
      .replace(/^﻿/, "")
      .replace(/^\s*--.*$/gm, "")
      .replace(/\s--.*$/gm, "");
    for (const statement of sql
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean)) {
      try {
        await conn.query(statement);
      } catch (error) {
        if (
          ![
            "ER_DUP_FIELDNAME",
            "ER_DUP_KEYNAME",
            "ER_TABLE_EXISTS_ERROR",
          ].includes(error.code)
        ) {
          skipReason = `migration ${file} failed: ${error.code}`;
          break;
        }
      }
    }
    if (skipReason) break;
  }
  await conn.end();
  if (skipReason) return;

  ({ query } = require("../src/config/db"));
  chatService = require("../src/services/chatService");
  followService = require("../src/services/followService");
  available = true;
});

after(async () => {
  if (!available) return;
  const { pool } = require("../src/config/db");
  await pool.end();
});

beforeEach(async () => {
  if (!available) return;
  await query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of [
    "chat_messages",
    "follows",
    "blocks",
    "mutual_matches",
    "users",
  ]) {
    await query(`TRUNCATE TABLE ${t}`);
  }
  await query("SET FOREIGN_KEY_CHECKS = 1");
});

async function member(username, { isPrivate = false } = {}) {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO users (id, username, full_name, is_private, phone_verified_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [id, username, username, isPrivate ? 1 : 0],
  );
  return id;
}

/** Insert a mutual match row, the ONLY thing that now unlocks messaging. */
async function match(a, b) {
  await query(
    `INSERT INTO mutual_matches (id, user_a_id, user_b_id) VALUES (?, ?, ?)`,
    [crypto.randomUUID(), a, b],
  );
}

const say = (from, to, text) =>
  chatService.sendMessage(to, from, {
    id: crypto.randomUUID(),
    type: "text",
    text,
    createdAt: Date.now(),
  });

const t = (name, fn) =>
  test(name, async (ctx) => {
    if (!available) return ctx.skip(skipReason || "database unavailable");
    return fn();
  });

// ------------------------------------------------------------ permission ---
//
// Rule: a mutual match is the only thing that unlocks sending. Everyone else
// gets a generic 403 so an attacker cannot distinguish "no match" from
// "blocked" from "user not found".

t("a mutual match lets both people message each other", async () => {
  const a = await member("asha");
  const b = await member("bina");
  await match(a, b);

  await say(a, b, "hello");
  const thread = await chatService.listMessages(b, a);
  assert.equal(thread.length, 1);
  assert.equal(thread[0].text, "hello");
});

t("no match refuses the message, and no error text leaks why", async () => {
  const a = await member("asha");
  const b = await member("bina"); // public by default — still needs a match
  await assert.rejects(() => say(a, b, "hello"), /not available/i);
  await assert.rejects(() => say(b, a, "hello back"), /not available/i);
});

t("an accepted follow alone does not unlock messaging", async () => {
  const a = await member("asha");
  const b = await member("bina", { isPrivate: true });

  // Make the follow real: request, then accept.
  await followService.follow(a, b);
  await followService.respond(b, a, true);

  // Even with the accepted follow, no message until a match exists.
  await assert.rejects(() => say(a, b, "hello"), /not available/i);

  // Once a mutual match is recorded, the same message goes through.
  await match(a, b);
  await say(a, b, "hello");
  assert.equal((await chatService.listMessages(b, a)).length, 1);
});

t("a block stops the conversation even when a match exists", async () => {
  const a = await member("asha");
  const b = await member("bina");
  await match(a, b);
  await say(a, b, "hello");

  await query(
    "INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)",
    [crypto.randomUUID(), b, a],
  );

  await assert.rejects(() => say(a, b, "again"), /not available/i);
  await assert.rejects(() => chatService.listMessages(b, a), /not available/i);
});

// --------------------------------------------------------------- storage ---

t(
  "both people see the same thread, which is the point of the pair key",
  async () => {
    const a = await member("asha");
    const b = await member("bina");
    await match(a, b);

    await say(a, b, "hi from asha");
    await say(b, a, "hi back from bina");

    // Each side addresses the conversation by the other's id.
    const seenByA = await chatService.listMessages(b, a);
    const seenByB = await chatService.listMessages(a, b);

    assert.equal(seenByA.length, 2, "asha should see both messages");
    assert.equal(seenByB.length, 2, "bina should see both messages");
    assert.deepEqual(
      seenByA.map((m) => m.text),
      ["hi from asha", "hi back from bina"],
    );
  },
);

t("a conversation is stored under one row group, not two", async () => {
  const a = await member("asha");
  const b = await member("bina");
  await match(a, b);

  await say(a, b, "one");
  await say(b, a, "two");
  const rows = await query(
    "SELECT DISTINCT conversation_id FROM chat_messages",
  );
  assert.equal(rows.length, 1, "both directions belong to one conversation");
  assert.match(rows[0].conversation_id, /^dm:/);
});

t("two different pairs do not share a conversation", async () => {
  const a = await member("asha");
  const b = await member("bina");
  const c = await member("chetan");
  await match(a, b);
  await match(a, c);

  await say(a, b, "to bina");
  await say(a, c, "to chetan");
  assert.equal((await chatService.listMessages(b, a)).length, 1);
  assert.equal((await chatService.listMessages(c, a)).length, 1);
});

// ----------------------------------------------------------------- inbox ---

t("the conversation list shows each person once, newest first", async () => {
  const me = await member("me");
  const first = await member("first_person");
  const second = await member("second_person");
  await match(me, first);
  await match(me, second);

  await say(me, first, "older");
  await new Promise((r) => setTimeout(r, 5));
  await say(second, me, "newer");

  const list = await chatService.listConversations(me);
  assert.equal(list.length, 2);
  assert.equal(
    list[0].user.username,
    "second_person",
    "newest conversation first",
  );
  assert.equal(list[1].user.username, "first_person");
  assert.equal(list[0].lastMessage.text, "newer");
});

t("the conversation list counts what you have not read", async () => {
  const me = await member("me");
  const them = await member("them");
  await match(me, them);

  await say(them, me, "one");
  await say(them, me, "two");

  let list = await chatService.listConversations(me);
  assert.equal(list[0].unread, 2);

  // Opening the thread marks it read.
  await chatService.listMessages(them, me);
  list = await chatService.listConversations(me);
  assert.equal(list[0].unread, 0);
});

t("your own messages are never counted as unread", async () => {
  const me = await member("me");
  const them = await member("them");
  await match(me, them);

  await say(me, them, "hello");
  const list = await chatService.listConversations(me);
  assert.equal(list[0].unread, 0);
});

t("an empty inbox is an empty list, not an error", async () => {
  const me = await member("me");
  assert.deepEqual(await chatService.listConversations(me), []);
});
