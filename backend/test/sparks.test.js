/**
 * Sparks, Super Likes and the Daily Question.
 *
 * The rules that matter: a free Spark is once a day and claimed by the
 * database, not the phone; nothing is spent before every refusal has been
 * checked; a Spark is never charged twice for the same person; and the
 * daily question pays out once a day, after the answer is stored.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(modulePath, stubs) {
  const resolved = require.resolve(modulePath);
  const from = require("node:path").dirname(resolved);
  const saved = new Map();
  for (const [id, exports] of Object.entries(stubs)) {
    const key = require.resolve(require("node:path").resolve(from, id));
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

const dup = () => Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });

/** A tiny fake of the parts of MySQL the spark service touches. */
function fakeDb({ freeUsed = false, already = false, target = true, blocked = false } = {}) {
  const sparks = [];
  const calls = [];
  return {
    sparks,
    calls,
    query: async (sql, params = []) => {
      const s = sql.replace(/\s+/g, " ").trim();
      calls.push(s);
      if (s.startsWith("SELECT id FROM users")) return target ? [{ id: params[0] }] : [];
      if (s.startsWith("SELECT 1 FROM blocks")) return blocked ? [{ 1: 1 }] : [];
      if (s.startsWith("SELECT 1 FROM match_sparks WHERE actor_id = ? AND target_id")) {
        return already ? [{ 1: 1 }] : [];
      }
      if (s.startsWith("SELECT 1 FROM match_sparks WHERE actor_id = ? AND free_day")) {
        return freeUsed || sparks.some((row) => row.free_day) ? [{ 1: 1 }] : [];
      }
      if (s.startsWith("INSERT INTO match_sparks")) {
        const [, , , kind, paidWith, freeDay] = params;
        if (freeDay && (freeUsed || sparks.some((row) => row.free_day === freeDay))) throw dup();
        sparks.push({ kind, paid_with: paidWith, free_day: freeDay });
        return { affectedRows: 1 };
      }
      if (s.startsWith("SELECT first_name")) return [{ first_name: "Asha" }];
      return [];
    },
  };
}

function sparkServiceWith(db, credits = { spark: 0, superlike: 0 }) {
  const spent = [];
  const refunded = [];
  const service = load("../src/services/sparkService", {
    "../config/db": { query: db.query },
    "./pushService": { notifyUser: async () => undefined },
    "./billingService": {
      indianDay: () => "2026-11-12",
      creditBalance: async (_u, kind) => credits[kind] ?? 0,
      spendCredit: async (_u, kind) => {
        if ((credits[kind] ?? 0) <= 0) return false;
        credits[kind] -= 1;
        spent.push(kind);
        return true;
      },
      addCredits: async (_u, kind, n) => {
        credits[kind] = (credits[kind] ?? 0) + n;
        refunded.push(kind);
      },
    },
  });
  return { service, spent, refunded, credits };
}

const decide = async () => ({ ok: true, mutual: false });

test("the first Spark of the day is free and spends no credit", async () => {
  const db = fakeDb();
  const { service, spent } = sparkServiceWith(db, { spark: 3 });
  const result = await service.send("me", "them", "spark", "hi", decide);
  assert.equal(result.paidWith, "free");
  assert.deepEqual(spent, []);
  assert.equal(db.sparks[0].free_day, "2026-11-12");
});

test("once today's free Spark is gone, an earned one is spent", async () => {
  const db = fakeDb({ freeUsed: true });
  const { service, spent } = sparkServiceWith(db, { spark: 1 });
  const result = await service.send("me", "them", "spark", "", decide);
  assert.equal(result.paidWith, "credit");
  assert.deepEqual(spent, ["spark"]);
  assert.equal(db.sparks[0].free_day, null);
});

test("no free Spark and no earned ones is refused with a way forward", async () => {
  const db = fakeDb({ freeUsed: true });
  const { service } = sparkServiceWith(db, { spark: 0 });
  await assert.rejects(
    () => service.send("me", "them", "spark", "", decide),
    (error) => error.statusCode === 402 && /question/i.test(error.message),
  );
  assert.equal(db.sparks.length, 0);
});

test("a Super Like always costs a bought credit, never the free Spark", async () => {
  const db = fakeDb();
  const { service, spent } = sparkServiceWith(db, { superlike: 1 });
  const result = await service.send("me", "them", "superlike", "", decide);
  assert.equal(result.paidWith, "credit");
  assert.deepEqual(spent, ["superlike"]);
  await assert.rejects(
    () => service.send("me", "other", "superlike", "", decide),
    (error) => error.statusCode === 402,
  );
});

test("nothing is spent when the send would be refused anyway", async () => {
  for (const [label, options] of [
    ["already sent", { already: true }],
    ["gone", { target: false }],
    ["blocked", { blocked: true }],
  ]) {
    const db = fakeDb(options);
    const { service, spent } = sparkServiceWith(db, { spark: 5, superlike: 5 });
    await assert.rejects(() => service.send("me", "them", "superlike", "", decide), label);
    assert.deepEqual(spent, [], `${label}: nothing should have been spent`);
    assert.equal(db.sparks.length, 0, `${label}: nothing should have been sent`);
  }
});

test("a Spark is a like that skips the free daily like limit", async () => {
  const db = fakeDb();
  const { service } = sparkServiceWith(db);
  let seen;
  await service.send("me", "them", "spark", "", async (...args) => {
    seen = args;
    return { mutual: true };
  });
  assert.deepEqual(seen, ["me", "them", "interested", { skipLikeLimit: true }]);
});

test("a note is trimmed and capped", async () => {
  const db = fakeDb();
  const inserted = [];
  const query = db.query;
  db.query = async (sql, params) => {
    if (/INSERT INTO match_sparks/.test(sql)) inserted.push(params);
    return query(sql, params);
  };
  const { service } = sparkServiceWith(db);
  await service.send("me", "them", "spark", `  ${"x".repeat(300)}  `, decide);
  assert.equal(inserted[0][6].length, service.NOTE_MAX);
});

/* ---------- Daily question ---------- */

function questionServiceWith({ rows, answered = null }) {
  const credited = [];
  const inserts = [];
  const service = load("../src/services/dailyQuestionService", {
    "../config/db": {
      query: async (sql, params = []) => {
        const s = sql.replace(/\s+/g, " ").trim();
        if (s.startsWith("SELECT id, question, options FROM daily_questions")) return rows;
        if (s.startsWith("SELECT question_id, answer FROM daily_question_answers")) {
          return answered ? [answered] : [];
        }
        if (s.startsWith("INSERT INTO daily_question_answers")) {
          if (answered) throw dup();
          inserts.push(params);
          return { affectedRows: 1 };
        }
        return [];
      },
    },
    "./billingService": {
      indianDay: () => "2026-11-12",
      addCredits: async (user, kind, n) => credited.push([user, kind, n]),
    },
  });
  return { service, credited, inserts };
}

const QUESTIONS = [
  { id: 1, question: "A?", options: ["x", "y"] },
  { id: 2, question: "B?", options: JSON.stringify(["p", "q"]) },
  { id: 3, question: "C?", options: ["m", "n"] },
];

test("everyone gets the same question all day, and it moves on the next", async () => {
  const { service } = questionServiceWith({ rows: QUESTIONS });
  const today = await service.todaysQuestion();
  const again = await service.todaysQuestion();
  assert.equal(today.id, again.id);
  const fake = load("../src/services/dailyQuestionService", {
    "../config/db": { query: async () => QUESTIONS },
    "./billingService": { indianDay: () => "2026-11-13", addCredits: async () => undefined },
  });
  const tomorrow = await fake.todaysQuestion();
  assert.notEqual(tomorrow.id, today.id);
  assert.ok(Array.isArray(tomorrow.options) && tomorrow.options.length === 2);
});

test("answering pays one Spark, after the answer is stored", async () => {
  const { service, credited, inserts } = questionServiceWith({ rows: QUESTIONS });
  const today = await service.todaysQuestion();
  await service.answer("me", today.id, today.options[0]);
  assert.equal(inserts.length, 1);
  assert.deepEqual(credited, [["me", "spark", 1]]);
});

test("a second answer the same day pays nothing", async () => {
  const today = await questionServiceWith({ rows: QUESTIONS }).service.todaysQuestion();
  const { service, credited } = questionServiceWith({
    rows: QUESTIONS,
    answered: { question_id: today.id, answer: today.options[0] },
  });
  await assert.rejects(
    () => service.answer("me", today.id, today.options[1]),
    (error) => error.statusCode === 409,
  );
  assert.deepEqual(credited, []);
});

test("an answer that is not one of the options, or for another day's question, is refused", async () => {
  const { service, credited } = questionServiceWith({ rows: QUESTIONS });
  const today = await service.todaysQuestion();
  await assert.rejects(() => service.answer("me", today.id, "something else"), (e) => e.statusCode === 400);
  const other = QUESTIONS.find((q) => q.id !== today.id);
  await assert.rejects(() => service.answer("me", other.id, "x"), (e) => e.statusCode === 409);
  assert.deepEqual(credited, []);
});
