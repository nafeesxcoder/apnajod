/**
 * Follow graph, account privacy and messaging permission.
 *
 * These run against a real MySQL, in a database of their own, because the
 * rules are expressed in SQL — privacy, the follow edge, blocks and the
 * either-direction check. The in-memory stand-in used by auth.test.js matches
 * on statement text, which would test the stand-in rather than the rules.
 *
 * If no database is reachable the suite skips with a reason instead of
 * failing, so `npm test` still works on a machine without MySQL running.
 */
const assert = require("node:assert/strict");
const { test, before, beforeEach, after } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";
// A database of its own, so running the suite never touches real data.
process.env.DB_NAME = process.env.TEST_DB_NAME || "milaan_test";

const mysql = require("mysql2/promise");
const env = require("../src/config/env");

let available = false;
let skipReason = "";
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

  // Apply the migrations the same way the runner does.
  const dir = path.join(__dirname, "..", "src", "migrations");
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: false,
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
      .map((s) => s.trim())
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
  for (const t of ["follows", "blocks", "mutual_matches", "users"]) {
    await query(`TRUNCATE TABLE ${t}`);
  }
  await query("SET FOREIGN_KEY_CHECKS = 1");
});

/** Insert a member directly; sign-up is covered by auth.test.js. */
async function member(username, { isPrivate = false, phone = null } = {}) {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO users (id, phone, username, full_name, is_private, phone_verified_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [id, phone, username, username, isPrivate ? 1 : 0],
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

// The skip has to be decided inside the test: the option form is evaluated
// when the test is defined, which is before the before() hook has run.
const t = (name, fn) =>
  test(name, async (ctx) => {
    if (!available) return ctx.skip(skipReason || "database unavailable");
    return fn();
  });

// ---------------------------------------------------------------- follows ---

t("following a public account takes effect immediately", async () => {
  const a = await member("asha");
  const b = await member("bina");
  const result = await followService.follow(a, b);
  assert.equal(result.status, "accepted");

  const state = await followService.followState(a, b);
  assert.equal(state.following, true);
  assert.equal(state.requested, false);
});

t("following a private account waits for the owner", async () => {
  const a = await member("asha");
  const b = await member("bina", { isPrivate: true });
  const result = await followService.follow(a, b);
  assert.equal(result.status, "pending");

  const state = await followService.followState(a, b);
  assert.equal(state.following, false);
  assert.equal(state.requested, true);

  const requests = await followService.listRequests(b);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].username, "asha");
});

t("accepting a request makes the follow real", async () => {
  const a = await member("asha");
  const b = await member("bina", { isPrivate: true });
  await followService.follow(a, b);
  const result = await followService.respond(b, a, true);
  assert.equal(result.status, "accepted");
  assert.equal((await followService.followState(a, b)).following, true);
  assert.equal((await followService.listRequests(b)).length, 0);
});

t("declining a request removes it without following", async () => {
  const a = await member("asha");
  const b = await member("bina", { isPrivate: true });
  await followService.follow(a, b);
  await followService.respond(b, a, false);
  const state = await followService.followState(a, b);
  assert.equal(state.following, false);
  assert.equal(state.requested, false);
  assert.equal((await followService.listRequests(b)).length, 0);
});

t("responding to a request that does not exist is an error", async () => {
  const a = await member("asha");
  const b = await member("bina", { isPrivate: true });
  await assert.rejects(
    () => followService.respond(b, a, true),
    /no pending request/i,
  );
});

t("following twice does not create a second edge or fail", async () => {
  const a = await member("asha");
  const b = await member("bina");
  await followService.follow(a, b);
  const again = await followService.follow(a, b);
  assert.equal(again.alreadyExisted, true);
  const [{ n }] = await query("SELECT COUNT(*) AS n FROM follows");
  assert.equal(n, 1);
});

t("you cannot follow yourself", async () => {
  const a = await member("asha");
  await assert.rejects(() => followService.follow(a, a), /your own account/i);
});

t("unfollowing removes the edge", async () => {
  const a = await member("asha");
  const b = await member("bina");
  await followService.follow(a, b);
  await followService.unfollow(a, b);
  assert.equal((await followService.followState(a, b)).following, false);
});

// ------------------------------------------------------------- messaging ---
//
// Messaging rule: the ONLY thing that unlocks a conversation is a mutual
// match. Follows — public or private, accepted or not — no longer grant
// message rights. These four tests replaced the old follow-based messaging
// tests, which asserted the follow-and-chat model that was abandoned.

t("a public account cannot be messaged without a mutual match", async () => {
  const a = await member("asha");
  const b = await member("bina"); // public by default
  const permission = await followService.canMessage(a, b);
  assert.equal(permission.allowed, false);
  assert.equal(permission.reason, "no_match");
});

t("a private account cannot be messaged without a mutual match", async () => {
  const a = await member("asha");
  const b = await member("bina", { isPrivate: true });
  await followService.follow(a, b);
  const permission = await followService.canMessage(a, b);
  assert.equal(permission.allowed, false);
  assert.equal(permission.reason, "no_match");
});

t(
  "an accepted follow does not unlock messaging — only a match does",
  async () => {
    const a = await member("asha", { isPrivate: true });
    const b = await member("bina", { isPrivate: true });
    await followService.follow(a, b);
    await followService.respond(b, a, true);

    // The follow is real, in both followState senses. But it buys no messages.
    const state = await followService.followState(a, b);
    assert.equal(state.following, true);
    assert.equal((await followService.canMessage(a, b)).allowed, false);
    assert.equal((await followService.canMessage(b, a)).allowed, false);
    assert.equal((await followService.canMessage(a, b)).reason, "no_match");
  },
);

t("a mutual match unlocks messaging in both directions", async () => {
  const a = await member("asha");
  const b = await member("bina");
  await match(a, b);

  const forward = await followService.canMessage(a, b);
  const backward = await followService.canMessage(b, a);

  assert.equal(forward.allowed, true);
  assert.equal(forward.reason, "mutual_match");
  assert.equal(backward.allowed, true);
  assert.equal(backward.reason, "mutual_match");
});

t(
  "a match between a public and a private account unlocks messaging",
  async () => {
    const a = await member("asha");
    const b = await member("bina", { isPrivate: true });
    await match(b, a); // insert in the other order to prove the OR in the query

    assert.equal((await followService.canMessage(a, b)).allowed, true);
    assert.equal((await followService.canMessage(b, a)).allowed, true);
  },
);

t("a block stops messaging in both directions", async () => {
  const a = await member("asha");
  const b = await member("bina");
  // Even with a match, a block wins.
  await match(a, b);
  await query(
    "INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)",
    [crypto.randomUUID(), b, a],
  );
  const forward = await followService.canMessage(a, b);
  const backward = await followService.canMessage(b, a);
  assert.equal(forward.allowed, false);
  assert.equal(forward.reason, "blocked");
  assert.equal(backward.allowed, false);
  assert.equal(backward.reason, "blocked");
});

t("a blocked account cannot be followed", async () => {
  const a = await member("asha");
  const b = await member("bina");
  await query(
    "INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)",
    [crypto.randomUUID(), b, a],
  );
  await assert.rejects(() => followService.follow(a, b), /not available/i);
});

t("you cannot message yourself", async () => {
  const a = await member("asha");
  assert.equal((await followService.canMessage(a, a)).allowed, false);
});

// --------------------------------------------------------------- privacy ---

t("going public accepts everyone who was waiting", async () => {
  const owner = await member("owner", { isPrivate: true });
  const a = await member("asha");
  const b = await member("bina");
  await followService.follow(a, owner);
  await followService.follow(b, owner);
  assert.equal((await followService.listRequests(owner)).length, 2);

  await followService.setPrivacy(owner, false);
  assert.equal((await followService.listRequests(owner)).length, 0);
  assert.equal((await followService.followState(a, owner)).following, true);
  assert.equal((await followService.followState(b, owner)).following, true);
});

t(
  "going private keeps existing followers but does not grant messaging",
  async () => {
    const owner = await member("owner");
    const a = await member("asha");
    await followService.follow(a, owner);
    await followService.setPrivacy(owner, true);

    // The follow edge survives going private.
    assert.equal((await followService.followState(a, owner)).following, true);
    // But it buys no messages — that is what the match gate is for.
    assert.equal((await followService.canMessage(a, owner)).allowed, false);
    assert.equal((await followService.canMessage(a, owner)).reason, "no_match");
  },
);

// ---------------------------------------------------------------- search ---

t(
  "username search matches part of a name and ranks the exact one first",
  async () => {
    const me = await member("me");
    await member("riya");
    await member("riya_07");
    await member("priyanka");

    const results = await followService.searchByUsername(me, "riya");
    const names = results.map((r) => r.username);
    assert.equal(names[0], "riya", "the exact match should come first");
    assert.ok(names.includes("riya_07"));
    assert.ok(
      names.includes("priyanka"),
      "a match anywhere in the name still counts",
    );
  },
);

t("search never returns you, and never anyone blocked either way", async () => {
  const me = await member("asha");
  const them = await member("ashok");
  await query(
    "INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)",
    [crypto.randomUUID(), them, me],
  );
  const results = await followService.searchByUsername(me, "as");
  assert.deepEqual(
    results.map((r) => r.username),
    [],
  );
});

t("search needs at least two characters", async () => {
  const me = await member("asha");
  await member("ashok");
  assert.deepEqual(await followService.searchByUsername(me, "a"), []);
});

t("search results say how you are related to each person", async () => {
  const me = await member("me");
  const followed = await member("followed_one");
  const pending = await member("pending_one", { isPrivate: true });
  await followService.follow(me, followed);
  await followService.follow(me, pending);

  const byName = Object.fromEntries(
    (await followService.searchByUsername(me, "_one")).map((r) => [
      r.username,
      r,
    ]),
  );
  assert.equal(byName.followed_one.following, true);
  assert.equal(byName.pending_one.requested, true);
  assert.equal(byName.pending_one.isPrivate, true);
});

// -------------------------------------------------------------- contacts ---

t("contact matching finds accounts however the number was typed", async () => {
  const me = await member("me", { phone: "+919000000001" });
  await member("friend", { phone: "+919876543210" });

  const results = await followService.matchContacts(me, [
    "9876543210",
    "+91 98765 43210",
    "098765-43210",
    "0091 9876543210",
    "not a number",
  ]);
  assert.equal(
    results.length,
    1,
    "the same number in five forms is one person",
  );
  assert.equal(results[0].username, "friend");
});

t("contact matching ignores you and anything unmatched", async () => {
  const me = await member("me", { phone: "+919000000001" });
  const results = await followService.matchContacts(me, [
    "9000000001",
    "9111111111",
  ]);
  assert.deepEqual(results, []);
});

// ---------------------------------------------------------------- counts ---

t("follower and following counts only count accepted edges", async () => {
  const owner = await member("owner", { isPrivate: true });
  const a = await member("asha");
  const b = await member("bina");
  await followService.follow(a, owner);
  await followService.respond(owner, a, true);
  await followService.follow(b, owner); // still pending

  const c = await followService.counts(owner);
  assert.equal(c.followers, 1);
  assert.equal(c.following, 0);
});
