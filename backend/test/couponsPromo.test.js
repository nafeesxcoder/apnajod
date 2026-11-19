const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * Pass codes the admin writes: each gives a free pass (plan + months), one
 * use per member, and old percent-off coupons no longer work.
 * The offer popup: one on at a time, everyone online hears about it.
 */
function load(file, stubs) {
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve(file)];
  const service = require(file);
  Module.prototype.require = original;
  return service;
}

function coupons(rows, passes = []) {
  const sqls = [];
  const service = load("../src/services/couponService.js", {
    "../config/db": {
      query: async (sql, params) => {
        const flat = sql.replace(/\s+/g, " ").trim();
        sqls.push({ sql: flat, params });
        return rows(flat, params) ?? [];
      },
    },
    "./passService": {
      givePass: async (adminId, userId, plan, months) => passes.push({ adminId, userId, plan, months }),
      getPass: async () => ({ plan: "plus", planLabel: "Plus", expiresAt: "2027-01-01T00:00:00Z" }),
    },
  });
  return { service, sqls };
}

const FREEPLUS = { id: "c1", code: "FREEPLUS", percent: 0, pass_plan: "plus", pass_months: 1, valid_until: null, max_uses: null, active: 1 };

/** Answers for a member who has not used the code, with `extra` overriding. */
function fresh(code, extra = {}) {
  return (sql) => {
    if (sql.startsWith("SELECT * FROM coupons")) return [code];
    if (sql.startsWith("SELECT COUNT(*) AS total FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?")) return [{ total: extra.mine ?? 0 }];
    if (sql.startsWith("SELECT COUNT(*) AS total FROM coupon_redemptions")) return [{ total: extra.all ?? 0 }];
    if (sql.startsWith("INSERT IGNORE INTO coupon_redemptions")) return { affectedRows: extra.claimed ?? 1 };
    return { affectedRows: 1 };
  };
}

test("codes are letters and numbers, upper case", () => {
  const { service } = coupons(() => []);
  assert.strictEqual(service.normalizeCode("diwali free"), "DIWALIFREE");
  assert.strictEqual(service.normalizeCode("ab"), null);
});

test("a pass code starts the free pass for the member, once", async () => {
  const passes = [];
  const { service, sqls } = coupons(fresh(FREEPLUS), passes);
  const result = await service.redeemPass("u1", "freeplus");
  assert.deepStrictEqual(passes, [{ adminId: null, userId: "u1", plan: "plus", months: 1 }]);
  assert.strictEqual(result.code, "FREEPLUS");
  assert.ok(sqls.some((q) => q.sql.startsWith("INSERT IGNORE INTO coupon_redemptions")));
});

test("used before, or two taps at once: refused, no second pass", async () => {
  const passes = [];
  const used = coupons(fresh(FREEPLUS, { mine: 1 }), passes).service;
  await assert.rejects(used.redeemPass("u1", "FREEPLUS"), (e) => e.status === 409);
  const raced = coupons(fresh(FREEPLUS, { claimed: 0 }), passes).service;
  await assert.rejects(raced.redeemPass("u1", "FREEPLUS"), (e) => e.status === 409);
  assert.strictEqual(passes.length, 0);
});

test("ended, off, used up, wrong, or an old percent coupon: refused", async () => {
  const ended = coupons(fresh({ ...FREEPLUS, valid_until: "2020-01-01 00:00:00" })).service;
  await assert.rejects(ended.redeemPass("u1", "FREEPLUS"), (e) => e.status === 410);
  const off = coupons(fresh({ ...FREEPLUS, active: 0 })).service;
  await assert.rejects(off.redeemPass("u1", "FREEPLUS"), (e) => e.status === 404);
  const usedUp = coupons(fresh({ ...FREEPLUS, max_uses: 2 }, { all: 2 })).service;
  await assert.rejects(usedUp.redeemPass("u1", "FREEPLUS"), (e) => e.status === 410 && /used up/.test(e.message));
  const none = coupons(() => []).service;
  await assert.rejects(none.redeemPass("u1", "NOPE1"), (e) => e.status === 404);
  const old = coupons(fresh({ ...FREEPLUS, pass_plan: null, percent: 50 })).service;
  await assert.rejects(old.redeemPass("u1", "FREEPLUS"), (e) => e.status === 410 && /no longer works/.test(e.message));
});

test("the admin makes a code with a plan and a length; bad ones are refused", async () => {
  const { service, sqls } = coupons(() => ({ affectedRows: 1 }));
  await service.create("admin", { code: "eid free", plan: "pro", months: 3, maxUses: 50 });
  const insert = sqls.find((q) => q.sql.startsWith("INSERT INTO coupons"));
  assert.deepStrictEqual(insert.params.slice(1), ["EIDFREE", null, 50, "admin", "pro", 3]);
  await assert.rejects(service.create("admin", { code: "X1X", plan: "gold", months: 1 }), (e) => e.status === 400);
  await assert.rejects(service.create("admin", { code: "X1X", plan: "plus", months: 2 }), (e) => e.status === 400);
});

test("a coupon counts as used when the payment is approved", async () => {
  const { service, sqls } = coupons((sql) => (sql.startsWith("SELECT id FROM coupons") ? [{ id: "c1" }] : { affectedRows: 1 }));
  await service.redeem({ id: "p1", user_id: "u1", coupon_code: "DIWALI50" });
  const insert = sqls.find((q) => q.sql.startsWith("INSERT IGNORE INTO coupon_redemptions"));
  assert.deepStrictEqual(insert.params, ["c1", "u1", "p1"]);
  const before = sqls.length;
  await service.redeem({ id: "p2", user_id: "u1", coupon_code: null });
  assert.strictEqual(sqls.length, before, "no coupon, nothing to do");
});

test("the offer popup: one on at a time, everyone online hears", async () => {
  const sqls = [];
  const emitted = [];
  const promo = load("../src/services/promoService.js", {
    "../config/db": {
      query: async (sql, params) => {
        const flat = sql.replace(/\s+/g, " ").trim();
        sqls.push({ sql: flat, params });
        if (flat.startsWith("SELECT id FROM coupons")) return [{ id: "c1" }];
        if (flat.startsWith("SELECT * FROM promo_popups")) return [{ id: "p1", headline: "50% OFF", style: "gold", active: 1, ends_at: null }];
        return { affectedRows: 1 };
      },
    },
    "./realtime": { emitToAll: (event, payload) => emitted.push({ event, payload }) },
  });
  await promo.publish({ headline: "50% OFF", title: "Premium for half", couponCode: "diwali50", style: "gold" });
  assert.strictEqual(sqls.find((q) => q.sql.startsWith("UPDATE promo_popups SET active = 0")) !== undefined, true);
  const insert = sqls.find((q) => q.sql.startsWith("INSERT INTO promo_popups"));
  assert.strictEqual(insert.params[5], "DIWALI50");
  assert.strictEqual(emitted[0].event, "app:promo");
  assert.strictEqual(emitted[0].payload.promo.headline, "50% OFF");
  await assert.rejects(promo.publish({ headline: "" }), (e) => e.status === 400);
});
