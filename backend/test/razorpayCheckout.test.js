const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const Module = require("node:module");

/**
 * Razorpay checkout on the website.
 *
 * Right after checkout the app sends Razorpay's signed receipt to
 * /billing/verify so Premium turns on at once; the webhook arrives later and
 * must not grant it a second time. Test keys (rzp_test_) open checkout to
 * admins only, so nobody can unlock Premium with a test card.
 */
const SECRET = "test_secret_for_signatures";

function sign(orderId, paymentId, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function load({ keyId = "rzp_test_abc", role = "member", payment } = {}) {
  process.env.RAZORPAY_KEY_ID = keyId;
  process.env.RAZORPAY_KEY_SECRET = SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = "hook_secret";
  const state = {
    grants: [],
    redeemed: 0,
    // One row in `payments`, as created when the order was made.
    payment: payment === undefined
      ? { id: "p1", user_id: "u1", plan_code: "gold_1m", provider_ref: "order_1", granted_at: null }
      : payment,
  };
  const onQuery = async (sql, params) => {
    if (/SELECT role FROM users/.test(sql)) return [{ role }];
    if (/SELECT user_id FROM payments/.test(sql)) return state.payment ? [{ user_id: state.payment.user_id }] : [];
    if (/SELECT \* FROM payments/.test(sql)) return state.payment ? [{ ...state.payment }] : [];
    if (/SELECT \* FROM billing_plans/.test(sql)) return [{ code: "gold_1m", amount_paise: 29900 }];
    if (/UPDATE payments/.test(sql)) {
      if (!state.payment || state.payment.granted_at) return { affectedRows: 0 };
      state.payment.granted_at = new Date();
      state.payment.provider_payment_id = params[0];
      return { affectedRows: 1 };
    }
    return [];
  };
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") return { query: async (sql, params) => onQuery(sql.replace(/\s+/g, " ").trim(), params) };
    if (id === "../services/billingService") return {
      grantPlan: async (userId, plan, source) => state.grants.push({ userId, code: plan.code, source }),
      summaryFor: async () => ({ premium: state.grants.length > 0 }),
    };
    if (id === "../services/couponService") return { redeem: async () => { state.redeemed += 1; }, checkoutCoupon: async () => null };
    if (id === "../services/upiService") return { config: () => ({ enabled: false }), mine: async () => [] };
    return original.apply(this, arguments);
  };
  try {
    for (const p of ["../src/controllers/billingController", "../src/services/razorpayService"]) {
      delete require.cache[require.resolve(p)];
    }
    return { controller: require("../src/controllers/billingController"), state };
  } finally {
    Module.prototype.require = original;
  }
}

/** Runs an asyncHandler route and returns { body } or { error }. */
function call(handler, req) {
  return new Promise((resolve) => {
    const res = { json: (body) => resolve({ body }), get: () => undefined };
    handler({ user: { id: "u1" }, get: () => undefined, ...req }, res, (error) => resolve({ error }));
  });
}

test("a genuine receipt turns Premium on at once", async () => {
  const { controller, state } = load();
  const out = await call(controller.verify, {
    body: { orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") },
  });
  assert.equal(out.error, undefined);
  assert.equal(out.body.granted, true);
  assert.deepEqual(state.grants, [{ userId: "u1", code: "gold_1m", source: "razorpay" }]);
  assert.equal(state.payment.provider_payment_id, "pay_1");
  assert.equal(state.redeemed, 1);
});

test("a forged or altered receipt is refused", async () => {
  const { controller, state } = load();
  const wrongSecret = await call(controller.verify, {
    body: { orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1", "guess") },
  });
  assert.equal(wrongSecret.error.statusCode, 400);
  // A real signature for a different payment does not unlock this order.
  const swapped = await call(controller.verify, {
    body: { orderId: "order_1", paymentId: "pay_2", signature: sign("order_1", "pay_1") },
  });
  assert.equal(swapped.error.statusCode, 400);
  assert.equal(state.grants.length, 0);
});

test("one member cannot claim another member's payment", async () => {
  const { controller, state } = load({
    payment: { id: "p1", user_id: "someone_else", plan_code: "gold_1m", provider_ref: "order_1", granted_at: null },
  });
  const out = await call(controller.verify, {
    body: { orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") },
  });
  assert.equal(out.error.statusCode, 404);
  assert.equal(state.grants.length, 0);
});

test("the webhook after verify does not grant Premium twice", async () => {
  const { controller, state } = load();
  await call(controller.verify, {
    body: { orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") },
  });
  const raw = Buffer.from(JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
  }));
  const hookSig = crypto.createHmac("sha256", "hook_secret").update(raw).digest("hex");
  const out = await call(controller.webhook, {
    body: raw,
    get: (name) => (name === "x-razorpay-signature" ? hookSig : undefined),
  });
  assert.equal(out.body.already_granted, true);
  assert.equal(state.grants.length, 1);
  // And a second verify of the same receipt is a no-op too.
  const again = await call(controller.verify, {
    body: { orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") },
  });
  assert.equal(again.body.granted, true);
  assert.equal(state.grants.length, 1);
});

test("test keys open checkout to admins only", async () => {
  const member = load({ keyId: "rzp_test_abc", role: "member" });
  const memberOptions = await call(member.controller.payOptions, {});
  assert.equal(memberOptions.body.razorpay, false);
  const memberOrder = await call(member.controller.createOrder, { body: { planCode: "gold_1m" } });
  assert.equal(memberOrder.error.statusCode, 503);

  const admin = load({ keyId: "rzp_test_abc", role: "admin" });
  const adminOptions = await call(admin.controller.payOptions, {});
  assert.equal(adminOptions.body.razorpay, true);
});

test("live keys open checkout to every member", async () => {
  const { controller } = load({ keyId: "rzp_live_abc", role: "member" });
  const out = await call(controller.payOptions, {});
  assert.equal(out.body.razorpay, true);
});
