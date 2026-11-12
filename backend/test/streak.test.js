/**
 * Chat streaks 🔥 - days in a row on which BOTH people wrote.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

const dbPath = require.resolve("../src/config/db");
const servicePath = require.resolve("../src/services/streakService");

function load(query = async () => []) {
  delete require.cache[servicePath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query } };
  try {
    return require(servicePath);
  } finally {
    delete require.cache[servicePath];
    delete require.cache[dbPath];
  }
}

const streaks = load();
// 22:00 IST on 12 Nov 2026.
const NOW = Date.parse("2026-11-12T16:30:00Z");
const today = streaks.dayNumber(NOW);
const days = (...back) => new Set(back.map((n) => today - n));

test("days turn over at midnight India time", () => {
  // 23:59 IST and 00:01 IST are different days, an hour apart in UTC terms.
  const before = Date.parse("2026-11-12T18:29:00Z");
  const after = Date.parse("2026-11-12T18:31:00Z");
  assert.equal(streaks.dayNumber(after) - streaks.dayNumber(before), 1);
});

test("both wrote today and the two days before: 3, safe", () => {
  assert.deepEqual(streaks.streakFromDays(days(0, 1, 2), NOW), { count: 3, atRisk: false, show: true });
});

test("not yet today but yesterday and before: still alive, at risk", () => {
  assert.deepEqual(streaks.streakFromDays(days(1, 2, 3), NOW), { count: 3, atRisk: true, show: true });
});

test("a whole day missed breaks it", () => {
  assert.equal(streaks.streakFromDays(days(2, 3, 4), NOW).count, 0);
});

test("a gap further back does not count the older run", () => {
  assert.equal(streaks.streakFromDays(days(0, 1, 3, 4, 5), NOW).count, 2);
});

test("one day of chatting is a chat, not a streak yet", () => {
  const one = streaks.streakFromDays(days(0), NOW);
  assert.equal(one.count, 1);
  assert.equal(one.show, false);
});

test("only days when both people wrote are counted, in one query for all chats", async () => {
  const sent = [];
  const service = load(async (sql, params) => {
    sent.push(sql.replace(/\s+/g, " "));
    return [
      { conversation_id: "dm:a:b", day_number: today },
      { conversation_id: "dm:a:b", day_number: today - 1 },
      { conversation_id: "dm:a:c", day_number: today - 1 },
    ];
  });
  const all = await service.forMember("a", NOW);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /HAVING COUNT\(DISTINCT sender_id\) >= 2/);
  assert.match(sent[0], /deleted_for_everyone = 0/);
  assert.deepEqual(all.get("dm:a:b"), { count: 2, atRisk: false, show: true });
  assert.deepEqual(all.get("dm:a:c"), { count: 1, atRisk: true, show: false });
  assert.deepEqual(await service.forConversation("a", "dm:a:zzz", NOW), service.EMPTY);
});
