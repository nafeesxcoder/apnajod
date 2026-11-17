const test = require("node:test");
const assert = require("node:assert");

/**
 * Google Play purchases, checked on the server before anything is granted.
 *
 * Google is faked here. What matters is: a purchase is granted once, a token
 * belongs to one member, a subscription must be active for this product,
 * and boosts are consumed after they are granted.
 */
const { createPlayBilling } = require("../src/services/playBillingService");

const TOKEN = "tok_abcdefghijklmnop";

function fakeDb({ plan, owned = null } = {}) {
  const state = { purchases: owned ? [{ ...owned }] : [], plan };
  const db = {
    state,
    query: async (sql, params = []) => {
      if (/FROM billing_plans WHERE play_product_id/.test(sql)) {
        return state.plan && params[0] === state.plan.play_product_id ? [{ ...state.plan }] : [];
      }
      if (/FROM play_purchases WHERE purchase_token/.test(sql)) {
        const row = state.purchases.find((p) => p.purchase_token === params[0]);
        return row ? [{ ...row }] : [];
      }
      if (/INSERT IGNORE INTO play_purchases/.test(sql)) {
        if (state.purchases.some((p) => p.purchase_token === params[0])) return { affectedRows: 0 };
        state.purchases.push({ purchase_token: params[0], user_id: params[1], plan_code: params[2], product_id: params[3], order_id: params[4], granted_at: null });
        return { affectedRows: 1 };
      }
      if (/UPDATE play_purchases SET granted_at/.test(sql)) {
        const row = state.purchases.find((p) => p.purchase_token === params[0]);
        if (row) row.granted_at = new Date();
        return { affectedRows: row ? 1 : 0 };
      }
      if (/INSERT INTO play_subscriptions/.test(sql)) return { affectedRows: 1 };
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
  return db;
}

function fakeBilling() {
  const grants = [];
  return {
    grants,
    grantPlan: async (userId, plan, source) => grants.push({ userId, code: plan.code, source }),
    summaryFor: async () => ({ premium: true }),
  };
}

function fakeGoogle(answers) {
  const calls = [];
  const request = async (method, path) => {
    calls.push(`${method} ${path}`);
    const answer = answers[`${method} ${path}`];
    if (answer instanceof Error) throw answer;
    if (answer === undefined) throw new Error(`no fake answer for ${method} ${path}`);
    return answer;
  };
  return { request, calls };
}

const SUB_PLAN = { code: "pro_monthly", kind: "subscription", grants: "pro", quantity: 30, play_product_id: "pro_monthly", active: 1 };
const BOOST_PLAN = { code: "boost_5", kind: "consumable", grants: "boost", quantity: 5, play_product_id: "boost_5", active: 1 };

const subPath = `purchases/subscriptionsv2/tokens/${TOKEN}`;
const subAck = `POST purchases/subscriptions/pro_monthly/tokens/${TOKEN}:acknowledge`;

test('an active subscription is acknowledged and granted once', async () => {
  const db = fakeDb({ plan: SUB_PLAN });
  const billing = fakeBilling();
  const google = fakeGoogle({
    [`GET ${subPath}`]: {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ productId: "pro_monthly" }],
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
      latestOrderId: "GPA.1",
    },
    [subAck]: {},
  });
  const play = createPlayBilling({ request: google.request, db, billing });

  const first = await play.verifyPurchase("u1", { productId: "pro_monthly", purchaseToken: TOKEN });
  assert.equal(first.granted, true);
  assert.deepStrictEqual(billing.grants, [{ userId: "u1", code: "pro_monthly", source: "play" }]);
  assert.ok(google.calls.includes(subAck));
});

test('the same token sent again does not grant again', async () => {
  const db = fakeDb({ plan: SUB_PLAN });
  const billing = fakeBilling();
  const google = fakeGoogle({
    [`GET ${subPath}`]: {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ productId: "pro_monthly" }],
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    },
  });
  const play = createPlayBilling({ request: google.request, db, billing });

  await play.verifyPurchase("u1", { productId: "pro_monthly", purchaseToken: TOKEN });
  await play.verifyPurchase("u1", { productId: "pro_monthly", purchaseToken: TOKEN });
  assert.equal(billing.grants.length, 1);
});

test('a token already used by another member is refused', async () => {
  const db = fakeDb({
    plan: SUB_PLAN,
    owned: { purchase_token: TOKEN, user_id: "someone-else", plan_code: "pro_monthly", product_id: "pro_monthly", granted_at: new Date() },
  });
  const billing = fakeBilling();
  const google = fakeGoogle({
    [`GET ${subPath}`]: { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [{ productId: "pro_monthly" }] },
  });
  const play = createPlayBilling({ request: google.request, db, billing });

  await assert.rejects(
    () => play.verifyPurchase("u1", { productId: "pro_monthly", purchaseToken: TOKEN }),
    (error) => error.status === 404 && /Purchase not found/.test(error.message),
  );
  assert.equal(billing.grants.length, 0);
});

test('a subscription that is not active is refused', async () => {
  const db = fakeDb({ plan: SUB_PLAN });
  const billing = fakeBilling();
  const google = fakeGoogle({
    [`GET ${subPath}`]: { subscriptionState: "SUBSCRIPTION_STATE_EXPIRED", lineItems: [{ productId: "pro_monthly" }] },
  });
  const play = createPlayBilling({ request: google.request, db, billing });

  await assert.rejects(
    () => play.verifyPurchase("u1", { productId: "pro_monthly", purchaseToken: TOKEN }),
    (error) => error.status === 400,
  );
  assert.equal(billing.grants.length, 0);
});

test('a subscription for a different product is refused', async () => {
  const db = fakeDb({ plan: SUB_PLAN });
  const billing = fakeBilling();
  const google = fakeGoogle({
    [`GET ${subPath}`]: { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [{ productId: "plus_monthly" }] },
  });
  const play = createPlayBilling({ request: google.request, db, billing });

  await assert.rejects(
    () => play.verifyPurchase("u1", { productId: "pro_monthly", purchaseToken: TOKEN }),
    (error) => error.status === 400,
  );
  assert.equal(billing.grants.length, 0);
});

test('a boost pack is granted, then consumed so it can be bought again', async () => {
  const db = fakeDb({ plan: BOOST_PLAN });
  const billing = fakeBilling();
  const consume = `POST purchases/products/boost_5/tokens/${TOKEN}:consume`;
  const google = fakeGoogle({
    [`GET purchases/products/boost_5/tokens/${TOKEN}`]: { purchaseState: 0, consumptionState: 0, orderId: "GPA.2" },
    [consume]: {},
  });
  const play = createPlayBilling({ request: google.request, db, billing });

  await play.verifyPurchase("u1", { productId: "boost_5", purchaseToken: TOKEN });
  assert.deepStrictEqual(billing.grants, [{ userId: "u1", code: "boost_5", source: "play" }]);
  assert.equal(google.calls[google.calls.length - 1], consume);
});

test('a boost pack that was never completed is refused', async () => {
  const db = fakeDb({ plan: BOOST_PLAN });
  const billing = fakeBilling();
  const google = fakeGoogle({
    [`GET purchases/products/boost_5/tokens/${TOKEN}`]: { purchaseState: 2, consumptionState: 0 },
  });
  const play = createPlayBilling({ request: google.request, db, billing });

  await assert.rejects(
    () => play.verifyPurchase("u1", { productId: "boost_5", purchaseToken: TOKEN }),
    (error) => error.status === 400,
  );
  assert.equal(billing.grants.length, 0);
});

test('a product that is not on sale is refused before Google is asked', async () => {
  const db = fakeDb({ plan: null });
  const billing = fakeBilling();
  const google = fakeGoogle({});
  const play = createPlayBilling({ request: google.request, db, billing });

  await assert.rejects(
    () => play.verifyPurchase("u1", { productId: "nope_1", purchaseToken: TOKEN }),
    (error) => error.status === 404,
  );
  assert.equal(google.calls.length, 0);
});

test('a bad product id or token is refused', async () => {
  const db = fakeDb({ plan: SUB_PLAN });
  const play = createPlayBilling({ request: fakeGoogle({}).request, db, billing: fakeBilling() });

  await assert.rejects(() => play.verifyPurchase("u1", { productId: "Pro Monthly!", purchaseToken: TOKEN }), (e) => e.status === 400);
  await assert.rejects(() => play.verifyPurchase("u1", { productId: "pro_monthly", purchaseToken: "x" }), (e) => e.status === 400);
});
