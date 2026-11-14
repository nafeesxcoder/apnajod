const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * UPI payments are checked by hand. The UTR is the only proof, so it has
 * to be a real 12 digit reference, one UTR can be used once, and approving
 * twice must not grant the plan twice.
 */
function load({ onQuery, grants, pushes }) {
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") return { query: async (sql, params) => onQuery(sql.replace(/\s+/g, " ").trim(), params) };
    if (id === "./billingService") return { grantPlan: async (userId, plan, source) => grants.push({ userId, code: plan.code, source }) };
    if (id === "./pushService") return { notifyUser: async (userId, payload) => pushes.push({ userId, payload }) };
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve("../src/services/upiService.js")];
  const service = require("../src/services/upiService.js");
  Module.prototype.require = original;
  return service;
}

const PLAN = { code: "plus_monthly", title: "Plus", amount_paise: 19900, kind: "subscription" };

test("a UTR is the 12 digit UPI reference", () => {
  const service = load({ onQuery: async () => [], grants: [], pushes: [] });
  assert.strictEqual(service.normalizeUtr("4321 5678 9012"), "432156789012");
  assert.strictEqual(service.normalizeUtr("432156789012"), "432156789012");
  assert.strictEqual(service.normalizeUtr("T2311141234567890"), null);
  assert.strictEqual(service.normalizeUtr("12345"), null);
  assert.strictEqual(service.normalizeUtr(""), null);
});

test("sending a UTR makes a pending payment and tells the admins", async () => {
  const inserted = [];
  const pushes = [];
  const service = load({
    grants: [],
    pushes,
    onQuery: async (sql, params) => {
      if (sql.startsWith("SELECT * FROM billing_plans")) return [PLAN];
      if (sql.startsWith("SELECT COUNT(*) AS total FROM payments")) return [{ total: 0 }];
      if (sql.startsWith("INSERT INTO payments")) { inserted.push(params); return { affectedRows: 1 }; }
      if (sql.includes("role = 'admin'")) return [{ id: "admin-1" }];
      if (sql.includes("FROM users u LEFT JOIN profiles")) return [{ first_name: "Asha" }];
      if (sql.includes("WHERE pay.id = ?")) return [{ id: params[0], plan_code: "plus_monthly", plan_title: "Plus", amount_paise: 19900, provider_ref: "432156789012", status: "pending" }];
      return [];
    },
  });
  const payment = await service.submit("u1", "plus_monthly", "4321 5678 9012");
  assert.strictEqual(payment.status, "pending");
  assert.strictEqual(inserted[0][3], "432156789012");
  assert.strictEqual(inserted[0][4], 19900, "the amount comes from the plan, not the app");
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(pushes[0].userId, "admin-1");
  assert.match(pushes[0].payload.body, /432156789012/);
});

test("the same UTR cannot be used twice", async () => {
  const service = load({
    grants: [],
    pushes: [],
    onQuery: async (sql) => {
      if (sql.startsWith("SELECT * FROM billing_plans")) return [PLAN];
      if (sql.startsWith("SELECT COUNT(*) AS total FROM payments")) return [{ total: 0 }];
      if (sql.startsWith("INSERT INTO payments")) { const e = new Error("dup"); e.code = "ER_DUP_ENTRY"; throw e; }
      return [];
    },
  });
  await assert.rejects(service.submit("u1", "plus_monthly", "432156789012"), (e) => e.status === 409);
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
  assert.strictEqual(service.APPROVAL_HOURS, 24);
});
