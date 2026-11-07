const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * The rules behind the paid features.
 *
 * These stub the database, so they run anywhere. The SQL itself was
 * exercised against a real MySQL: a grant makes a member premium, renewing
 * early extends the expiry instead of restarting it, a boost pack adds
 * credits, starting a boost spends one, and a second boost is refused
 * while one is running.
 */
function loadBilling({ rows = () => [], env = {} } = {}) {
  const sqls = [];
  const original = Module.prototype.require;
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") {
      return {
        query: async (sql, params) => {
          sqls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
          return rows(sql, params);
        },
      };
    }
    return original.apply(this, arguments);
  };
  try {
    for (const id of ["../src/services/billingService", "../src/config/billing"]) {
      delete require.cache[require.resolve(id)];
    }
    return { billing: require("../src/services/billingService"), sqls };
  } finally {
    Module.prototype.require = original;
  }
}

test("the like allowance resets at midnight in India, not UTC", () => {
  const { billing } = loadBilling();
  // 18:30 UTC is 00:00 the next day in India: the start of a new allowance.
  const justAfterIndianMidnight = new Date("2026-03-10T18:31:00Z");
  assert.equal(
    billing.startOfIndianDay(justAfterIndianMidnight).toISOString(),
    "2026-03-10T18:30:00.000Z",
  );
  // A minute earlier is still the previous Indian day.
  const justBefore = new Date("2026-03-10T18:29:00Z");
  assert.equal(
    billing.startOfIndianDay(justBefore).toISOString(),
    "2026-03-09T18:30:00.000Z",
  );
});

test("UTC midnight is not treated as the reset", () => {
  const { billing } = loadBilling();
  // Using UTC would reset everyone's likes at 5:30 in the morning IST.
  const start = billing.startOfIndianDay(new Date("2026-03-10T02:00:00Z"));
  assert.notEqual(start.toISOString().slice(11, 19), "00:00:00");
  assert.equal(start.toISOString(), "2026-03-09T18:30:00.000Z");
});

test("a premium member has no like limit", async () => {
  const { billing } = loadBilling({
    rows: (sql) => (/FROM entitlements/.test(sql) ? [{ "1": 1 }] : []),
  });
  const allowance = await billing.likeAllowance("u1");
  assert.equal(allowance.premium, true);
  assert.equal(allowance.limit, null);
  assert.equal(allowance.remaining, null);
});

test("a free member gets the configured number of likes a day", async () => {
  const { billing } = loadBilling({
    env: { FREE_DAILY_LIKES: "15" },
    rows: (sql) => (/COUNT\(\*\) AS used/.test(sql) ? [{ used: 4 }] : []),
  });
  const allowance = await billing.likeAllowance("u1");
  assert.deepEqual(allowance, {
    premium: false,
    limit: 15,
    used: 4,
    remaining: 11,
  });
});

test("remaining never goes below zero", async () => {
  const { billing } = loadBilling({
    env: { FREE_DAILY_LIKES: "5" },
    rows: (sql) => (/COUNT\(\*\) AS used/.test(sql) ? [{ used: 9 }] : []),
  });
  const allowance = await billing.likeAllowance("u1");
  assert.equal(allowance.remaining, 0);
});

test("renewing extends the expiry rather than restarting it", async () => {
  const { billing, sqls } = loadBilling();
  await billing.grantFeature("u1", "premium", 30, "razorpay");
  const grant = sqls.find((entry) => /INSERT INTO entitlements/.test(entry.sql));
  assert.ok(grant, "it should write an entitlement");
  // Paying again while still subscribed must not throw away paid-for time.
  assert.match(grant.sql, /GREATEST\(COALESCE\(expires_at/);
});

test("spending a credit cannot take the balance below zero", async () => {
  const { billing, sqls } = loadBilling({ rows: () => ({ affectedRows: 0 }) });
  assert.equal(await billing.spendCredit("u1", "boost"), false);
  const spend = sqls.find((entry) => /UPDATE credit_balances/.test(entry.sql));
  // The guard is in the UPDATE, so two requests at once cannot both pass.
  assert.match(spend.sql, /balance > 0/);
});

test("a spent credit reports success", async () => {
  const { billing } = loadBilling({ rows: () => ({ affectedRows: 1 }) });
  assert.equal(await billing.spendCredit("u1", "boost"), true);
});

test("a subscription plan grants time and a consumable grants credits", async () => {
  const { billing, sqls } = loadBilling();
  await billing.grantPlan("u1", { kind: "subscription", grants: "premium", quantity: 30 }, "play");
  await billing.grantPlan("u1", { kind: "consumable", grants: "boost", quantity: 5 }, "play");
  assert.ok(sqls.some((e) => /INSERT INTO entitlements/.test(e.sql)));
  assert.ok(sqls.some((e) => /INSERT INTO credit_balances/.test(e.sql)));
});
