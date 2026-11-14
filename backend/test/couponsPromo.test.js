const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * Coupons the admin writes: one use per member, Premium plans only, the
 * cheaper of coupon and festival offer wins, and the price is the server's.
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

const realBilling = require("../src/services/billingService.js");
const PLUS = { code: "plus_monthly", kind: "subscription", amount_paise: 19900 };
const BOOSTS = { code: "boost_pack", kind: "consumable", amount_paise: 9900 };

function coupons(rows, { festivalPrice } = {}) {
  const sqls = [];
  const service = load("../src/services/couponService.js", {
    "../config/db": {
      query: async (sql, params) => {
        const flat = sql.replace(/\s+/g, " ").trim();
        sqls.push({ sql: flat, params });
        return rows(flat, params) ?? [];
      },
    },
    "./billingService": {
      offerPrice: realBilling.offerPrice,
      chargeFor: async (plan) => festivalPrice ?? Number(plan.amount_paise),
    },
  });
  return { service, sqls };
}

const DIWALI50 = { id: "c1", code: "DIWALI50", percent: 50, valid_until: null, max_uses: null, active: 1, show_at_checkout: 1 };

test("codes are letters and numbers, upper case", () => {
  const { service } = coupons(() => []);
  assert.strictEqual(service.normalizeCode(" diwali-50 "), "DIWALI50");
  assert.strictEqual(service.normalizeCode("ab"), null);
});

test("50% off Plus: ₹199 becomes ₹99, and the coupon is noted", async () => {
  const { service } = coupons((sql) => {
    if (sql.startsWith("SELECT * FROM coupons WHERE code")) return [DIWALI50];
    if (sql.includes("COUNT(*)")) return [{ total: 0 }];
  });
  const price = await service.priceFor(PLUS, "u1", "diwali50");
  assert.deepStrictEqual(price, { amountPaise: 9900, originalPaise: 19900, couponCode: "DIWALI50", percent: 50 });
});

test("a member cannot use the same coupon twice", async () => {
  const { service } = coupons((sql) => {
    if (sql.startsWith("SELECT * FROM coupons WHERE code")) return [DIWALI50];
    if (sql.includes("FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?")) return [{ total: 1 }];
    if (sql.includes("COUNT(*)")) return [{ total: 0 }];
  });
  await assert.rejects(service.priceFor(PLUS, "u1", "DIWALI50"), (e) => e.status === 409 && /already used/.test(e.message));
});

test("nor while a payment with it is waiting", async () => {
  const { service } = coupons((sql) => {
    if (sql.startsWith("SELECT * FROM coupons WHERE code")) return [DIWALI50];
    if (sql.includes("FROM payments")) return [{ total: 1 }];
    if (sql.includes("COUNT(*)")) return [{ total: 0 }];
  });
  await assert.rejects(service.priceFor(PLUS, "u1", "DIWALI50"), (e) => e.status === 409);
});

test("ended, switched off, used up, wrong code, or a Boost pack: refused", async () => {
  const ended = coupons((sql) =>
    sql.startsWith("SELECT * FROM coupons WHERE code") ? [{ ...DIWALI50, valid_until: "2020-01-01 00:00:00" }] : [{ total: 0 }],
  ).service;
  await assert.rejects(ended.priceFor(PLUS, "u1", "DIWALI50"), (e) => e.status === 410);
  const off = coupons((sql) => (sql.startsWith("SELECT * FROM coupons WHERE code") ? [{ ...DIWALI50, active: 0 }] : [{ total: 0 }])).service;
  await assert.rejects(off.priceFor(PLUS, "u1", "DIWALI50"), (e) => e.status === 404);
  const usedUp = coupons((sql) => {
    if (sql.startsWith("SELECT * FROM coupons WHERE code")) return [{ ...DIWALI50, max_uses: 2 }];
    if (sql === "SELECT COUNT(*) AS total FROM coupon_redemptions WHERE coupon_id = ?") return [{ total: 2 }];
    return [{ total: 0 }];
  }).service;
  await assert.rejects(usedUp.priceFor(PLUS, "u1", "DIWALI50"), (e) => e.status === 410 && /used up/.test(e.message));
  const none = coupons(() => []).service;
  await assert.rejects(none.priceFor(PLUS, "u1", "NOPE1"), (e) => e.status === 404);
  await assert.rejects(none.priceFor(BOOSTS, "u1", "DIWALI50"), (e) => e.status === 400);
});

test("with a bigger festival offer on, the festival price wins and no coupon is used", async () => {
  const { service } = coupons(
    (sql) => {
      if (sql.startsWith("SELECT * FROM coupons WHERE code")) return [{ ...DIWALI50, percent: 10 }];
      if (sql.includes("COUNT(*)")) return [{ total: 0 }];
    },
    { festivalPrice: 13900 },
  );
  const price = await service.priceFor(PLUS, "u1", "DIWALI50");
  assert.strictEqual(price.amountPaise, 13900);
  assert.strictEqual(price.couponCode, null);
});

test("showing a coupon at payment turns it off for the others", async () => {
  const { service, sqls } = coupons(() => ({ affectedRows: 1 }));
  await service.create("admin", { code: "eid30", percent: 30, showAtCheckout: true });
  assert.strictEqual(sqls[0].sql, "UPDATE coupons SET show_at_checkout = 0");
  const insert = sqls.find((q) => q.sql.startsWith("INSERT INTO coupons"));
  assert.strictEqual(insert.params[1], "EID30");
  assert.strictEqual(insert.params[2], 30);
  await assert.rejects(service.create("admin", { code: "BIG95", percent: 95 }), (e) => e.status === 400);
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
