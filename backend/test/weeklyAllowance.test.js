/**
 * Weekly Boosts and Super Likes for Plus and Pro.
 *
 * Paid once a week, never twice, the right amount for the plan, and a
 * Plus -> Pro upgrade mid-week tops up only the difference.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

const servicePath = require.resolve("../src/services/billingService");
const dbPath = require.resolve("../src/config/db");

const dup = () => Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });

/** A fake database holding entitlements, grant rows and credits. */
function world({ features = [] } = {}) {
  const grants = new Map();
  const credits = { boost: 0, superlike: 0 };
  const query = async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT 1 FROM entitlements")) {
      const asked = params.slice(1);
      return asked.some((f) => features.includes(f)) ? [{ 1: 1 }] : [];
    }
    if (s.startsWith("INSERT INTO weekly_allowance_grants")) {
      const [user, week, plan] = params;
      const key = `${user}|${week}`;
      if (grants.has(key)) throw dup();
      grants.set(key, plan);
      return { affectedRows: 1 };
    }
    if (s.startsWith("UPDATE weekly_allowance_grants")) {
      const [plan, user, week, from] = params;
      const key = `${user}|${week}`;
      if (grants.get(key) !== from) return { affectedRows: 0 };
      grants.set(key, plan);
      return { affectedRows: 1 };
    }
    if (s.startsWith("INSERT INTO credit_balances")) {
      const [, kind, quantity] = params;
      credits[kind] += quantity;
      return { affectedRows: 1 };
    }
    return [];
  };
  return { grants, credits, query };
}

function load(db) {
  delete require.cache[servicePath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { query: db.query, pool: { end: async () => {} } },
  };
  try {
    return require(servicePath);
  } finally {
    delete require.cache[servicePath];
    delete require.cache[dbPath];
  }
}

// A Thursday in India.
const THURSDAY = new Date("2026-11-12T10:00:00Z");

test("weeks start on Monday, India time", () => {
  const billing = load(world());
  assert.equal(billing.indianWeekStart(THURSDAY), "2026-11-09");
  // Sunday 23:00 IST is still the old week, Monday 00:30 IST the new one.
  assert.equal(billing.indianWeekStart(new Date("2026-11-15T17:30:00Z")), "2026-11-09");
  assert.equal(billing.indianWeekStart(new Date("2026-11-15T19:00:00Z")), "2026-11-16");
});

test("a free member gets nothing", async () => {
  const db = world();
  const billing = load(db);
  await billing.ensureWeeklyAllowance("u1", THURSDAY);
  assert.deepEqual(db.credits, { boost: 0, superlike: 0 });
});

test("Plus gets 1 boost and 2 super likes, once a week", async () => {
  const db = world({ features: ["premium"] });
  const billing = load(db);
  await billing.ensureWeeklyAllowance("u1", THURSDAY);
  await billing.ensureWeeklyAllowance("u1", THURSDAY);
  await billing.ensureWeeklyAllowance("u1", new Date("2026-11-14T10:00:00Z"));
  assert.deepEqual(db.credits, { boost: 1, superlike: 2 });
  await billing.ensureWeeklyAllowance("u1", new Date("2026-11-17T10:00:00Z"));
  assert.deepEqual(db.credits, { boost: 2, superlike: 4 }, "next week pays again");
});

test("Pro gets 3 boosts and 5 super likes", async () => {
  const db = world({ features: ["pro"] });
  const billing = load(db);
  await billing.ensureWeeklyAllowance("u1", THURSDAY);
  assert.deepEqual(db.credits, { boost: 3, superlike: 5 });
});

test("moving from Plus to Pro mid-week tops up only the difference", async () => {
  const db = world({ features: ["premium"] });
  const billing = load(db);
  await billing.ensureWeeklyAllowance("u1", THURSDAY);
  assert.deepEqual(db.credits, { boost: 1, superlike: 2 });
  const upgraded = world({ features: ["pro"] });
  // Same grant table and credits, now on Pro.
  const shared = {
    query: async (sql, params) => {
      if (/^SELECT 1 FROM entitlements/.test(sql.replace(/\s+/g, " ").trim())) {
        return upgraded.query(sql, params);
      }
      return db.query(sql, params);
    },
  };
  const proBilling = load(shared);
  await proBilling.ensureWeeklyAllowance("u1", THURSDAY);
  await proBilling.ensureWeeklyAllowance("u1", THURSDAY);
  assert.deepEqual(db.credits, { boost: 3, superlike: 5 }, "never more than a Pro week");
});
