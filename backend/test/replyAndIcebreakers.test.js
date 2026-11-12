/**
 * "Your turn" reminders and icebreakers.
 *
 * Reminders: one push per message, never for a closed account, a block or
 * a muted chat, and at most one every 12 hours per person.
 * Icebreakers: only for people who can message each other, three lines,
 * built from what the two actually share.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(modulePath, stubs) {
  const resolved = require.resolve(modulePath);
  const from = path.dirname(resolved);
  const saved = new Map();
  for (const [id, exports] of Object.entries(stubs)) {
    const key = require.resolve(path.resolve(from, id));
    saved.set(key, require.cache[key]);
    require.cache[key] = { id: key, filename: key, loaded: true, exports };
  }
  delete require.cache[resolved];
  try {
    return require(resolved);
  } finally {
    for (const [key, entry] of saved) {
      if (entry) require.cache[key] = entry;
      else delete require.cache[key];
    }
    delete require.cache[resolved];
  }
}

/* ---------- reply reminders ---------- */

function reminderWorld({ waiting, gone = [], blocked = false, muted = false, recent = false }) {
  const claimed = new Set();
  const pushes = [];
  const query = async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT m.conversation_id")) return waiting;
    if (s.startsWith("SELECT id FROM users")) return gone.includes(params[0]) ? [] : [{ id: params[0] }];
    if (s.startsWith("SELECT 1 FROM blocks")) return blocked ? [{ 1: 1 }] : [];
    if (s.startsWith("SELECT settings FROM chat_conversation_settings")) {
      return muted ? [{ settings: JSON.stringify({ notificationMode: "muted" }) }] : [];
    }
    if (s.startsWith("SELECT 1 FROM chat_reply_reminders")) return recent ? [{ 1: 1 }] : [];
    if (s.startsWith("INSERT IGNORE INTO chat_reply_reminders")) {
      const key = `${params[0]}|${params[1]}`;
      if (claimed.has(key)) return { affectedRows: 0 };
      claimed.add(key);
      return { affectedRows: 1 };
    }
    if (s.startsWith("SELECT first_name")) return [{ first_name: "Riya" }];
    return [];
  };
  const service = load("../src/services/replyReminderService", {
    "../config/db": { query },
    "./pushService": { notifyUser: async (user, payload) => pushes.push({ user, payload }) },
  });
  return { service, pushes };
}

const row = { conversation_id: "dm:aaa:bbb", id: "m1", sender_id: "aaa" };

test("the person who owes a reply gets one push, naming who is waiting", async () => {
  const { service, pushes } = reminderWorld({ waiting: [row] });
  assert.equal(await service.runOnce(), 1);
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0].user, "bbb", "the receiver, never the sender");
  assert.match(pushes[0].payload.title, /Riya is waiting/);
  assert.equal(pushes[0].payload.conversationId, "aaa", "opens the right chat");
});

test("the same message is never reminded about twice", async () => {
  const { service, pushes } = reminderWorld({ waiting: [row, row] });
  await service.runOnce();
  assert.equal(pushes.length, 1);
});

test("no reminder for a closed account, a block, a muted chat, or within 12 hours of the last", async () => {
  for (const [label, options] of [
    ["closed", { gone: ["bbb"] }],
    ["blocked", { blocked: true }],
    ["muted", { muted: true }],
    ["recent", { recent: true }],
  ]) {
    const { service, pushes } = reminderWorld({ waiting: [row], ...options });
    assert.equal(await service.runOnce(), 0, label);
    assert.equal(pushes.length, 0, label);
  }
});

test("only direct chats between two people are understood", () => {
  const { service } = reminderWorld({ waiting: [] });
  assert.equal(service.otherParticipant("dm:a:b", "a"), "b");
  assert.equal(service.otherParticipant("dm:a:b", "b"), "a");
  assert.equal(service.otherParticipant("dm:a:b", "c"), null);
  assert.equal(service.otherParticipant("group:x", "a"), null);
});

test("waits a few hours before nudging, and gives up after two days", () => {
  const { service } = reminderWorld({ waiting: [] });
  assert.ok(service.WAIT_MS >= 3 * 60 * 60 * 1000, "not straight away");
  assert.ok(service.GIVE_UP_MS <= 72 * 60 * 60 * 1000, "not forever");
});

/* ---------- icebreakers ---------- */

function icebreakerWorld({ allowed = true, profiles, sameAnswer = null }) {
  return load("../src/services/icebreakerService", {
    "../config/db": {
      query: async (sql) => {
        const s = sql.replace(/\s+/g, " ").trim();
        if (s.startsWith("SELECT user_id, city, hobbies FROM profiles")) return profiles;
        if (s.startsWith("SELECT q.question, a.answer")) return sameAnswer ? [sameAnswer] : [];
        return [];
      },
    },
    "./chatService": {
      assertParticipant: async () => {
        if (!allowed) throw Object.assign(new Error("no"), { status: 403 });
        return ["me", "them"];
      },
    },
  });
}

test("icebreakers are only for people who can already message each other", async () => {
  const service = icebreakerWorld({ allowed: false, profiles: [] });
  await assert.rejects(() => service.forPair("me", "them"), (e) => e.statusCode === 403);
});

test("icebreakers use what the two actually share", async () => {
  const service = icebreakerWorld({
    profiles: [
      { user_id: "me", city: "Bareilly, UP", hobbies: JSON.stringify(["Travel", "Music"]) },
      { user_id: "them", city: "bareilly", hobbies: ["music", "Art"] },
    ],
    sameAnswer: { question: "Pick a holiday", answer: "Mountains" },
  });
  const lines = await service.forPair("me", "them");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /Mountains/);
  assert.match(lines[1], /music/);
  assert.match(lines[2], /Bareilly/);
});

test("with nothing in common there are still three good general lines, the same each time", async () => {
  const service = icebreakerWorld({
    profiles: [
      { user_id: "me", city: "Delhi", hobbies: [] },
      { user_id: "them", city: "Pune", hobbies: [] },
    ],
  });
  const first = await service.forPair("me", "them");
  const again = await service.forPair("me", "them");
  assert.equal(first.length, 3);
  assert.equal(new Set(first).size, 3);
  assert.deepEqual(first, again, "lines do not reshuffle every time the chat opens");
  for (const line of first) assert.ok(service.GENERAL_LINES.includes(line));
});
