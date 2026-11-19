const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * UPI payments members sent earlier are checked by hand: approving twice
 * must not grant the plan twice. New ones can no longer be sent.
 */
function load({ onQuery, grants, pushes }) {
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") return { query: async (sql, params) => onQuery(sql.replace(/\s+/g, " ").trim(), params) };
    if (id === "./billingService") return {
      grantPlan: async (userId, plan, source) => grants.push({ userId, code: plan.code, source }),
      chargeFor: async (plan) => Number(plan.amount_paise),
    };
    if (id === "./couponService") return {
      priceFor: async (plan) => ({ amountPaise: Number(plan.amount_paise), couponCode: null }),
      redeem: async () => undefined,
    };
    if (id === "./pushService") return { notifyUser: async (userId, payload) => pushes.push({ userId, payload }) };
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve("../src/services/upiService.js")];
  const service = require("../src/services/upiService.js");
  Module.prototype.require = original;
  return service;
}

const PLAN = { code: "plus_monthly", title: "Plus", amount_paise: 19900, kind: "subscription" };

test("members can no longer send a UPI payment: Google Play only", () => {
  const fs = require("node:fs");
  const routes = fs.readFileSync(require.resolve("../src/routes/billingRoutes.js"), "utf8");
  assert.ok(!routes.includes('"/upi"'));
  assert.ok(!routes.includes('"/pay-options"'));
  const service = load({ onQuery: async () => [], grants: [], pushes: [] });
  assert.strictEqual(service.submit, undefined);
});

test("approving grants the plan once, even if clicked twice", async () => {
  const grants = [];
  let granted = false;
  const service = load({
    grants,
    pushes: [],
    onQuery: async (sql) => {
      if (sql.startsWith("SELECT * FROM payments")) return [{ id: "p1", user_id: "u1", plan_code: "plus_monthly", granted_at: null }];
      if (sql.startsWith("SELECT * FROM billing_plans")) return [PLAN];
      if (sql.startsWith("UPDATE payments SET status = 'paid'")) {
        if (granted) return { affectedRows: 0 };
        granted = true;
        return { affectedRows: 1 };
      }
      return [];
    },
  });
  assert.deepStrictEqual(await service.approve("p1"), { approved: true });
  assert.deepStrictEqual(await service.approve("p1"), { alreadyApproved: true });
  assert.deepStrictEqual(grants, [{ userId: "u1", code: "plus_monthly", source: "upi" }]);
});

test("a payment rejected by mistake can still be approved later", async () => {
  const service = load({ onQuery: async () => [], grants: [], pushes: [] });
  const src = require("node:fs").readFileSync(require.resolve("../src/services/upiService.js"), "utf8");
  assert.ok(src.includes("status IN ('pending','rejected')"));
  assert.strictEqual(typeof service.approve, "function");
});
