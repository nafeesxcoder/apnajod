const test = require("node:test");
const assert = require("node:assert");

/**
 * Google Play subscriptions after the first purchase: renewals, cancellations,
 * expiries and the notifications that announce them.
 *
 * Google is faked. What matters: Premium runs until the date Google gives,
 * a cancelled subscription keeps its paid period, an expired one ends now,
 * and a message from Google is read and checked before anything changes.
 */
const { createPlayBilling, manageUrl } = require("../src/services/playBillingService");

const TOKEN = "tok_renewal_abcdefghijklmnop";
const PRODUCT = "pro_monthly";
const USER = "u1";

function fakeDb({ owner = { user_id: USER, plan_code: PRODUCT, product_id: PRODUCT }, plan = { code: PRODUCT, kind: "subscription", grants: "pro" }, stored = null } = {}) {
  const state = { subscriptions: stored ? [{ ...stored }] : [] };
  const db = {
    state,
    query: async (sql, params = []) => {
      if (/FROM play_purchases WHERE purchase_token/.test(sql)) {
        return params[0] === TOKEN && owner ? [{ ...owner }] : [];
      }
      if (/FROM billing_plans WHERE code = \?/.test(sql)) {
        return plan && params[0] === plan.code ? [{ ...plan }] : [];
      }
      if (/INSERT INTO play_subscriptions/.test(sql)) {
        const [token, userId, productId, subState, autoRenew, expiresAt] = params;
        const row = { purchase_token: token, user_id: userId, product_id: productId, state: subState, auto_renew: autoRenew, expires_at: expiresAt, updated_at: new Date() };
        const index = state.subscriptions.findIndex((s) => s.purchase_token === token);
        if (index >= 0) state.subscriptions[index] = row;
        else state.subscriptions.push(row);
        return { affectedRows: 1 };
      }
      if (/FROM play_subscriptions\s+WHERE user_id/.test(sql)) {
        const [userId, productId] = params;
        return state.subscriptions.filter((s) => s.user_id === userId && s.product_id === productId).slice(0, 1);
      }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
  return db;
}

function fakeBilling() {
  const calls = { until: [], grants: [] };
  return {
    calls,
    setFeatureUntil: async (userId, feature, expiresAt, source) => calls.until.push({ userId, feature, expiresAt, source }),
    grantPlan: async (userId, plan, source) => calls.grants.push({ userId, code: plan.code, source }),
    summaryFor: async () => ({ premium: true }),
  };
}

function googleSub({ state = "SUBSCRIPTION_STATE_ACTIVE", expiry, autoRenew = true, product = PRODUCT } = {}) {
  return {
    subscriptionState: state,
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    latestOrderId: "GPA.9",
    lineItems: [
      {
        productId: product,
        expiryTime: expiry,
        autoRenewingPlan: { autoRenewEnabled: autoRenew },
      },
    ],
  };
}

function fakeGoogle(sub) {
  const calls = [];
  return {
    calls,
    request: async (method, path) => {
      calls.push(`${method} ${path}`);
      if (sub === "missing") throw new Error("should not ask Google");
      return sub;
    },
  };
}

function notification(payload, { packageName = "com.apnajoda.app" } = {}) {
  const event = { version: "1.0", packageName, eventTimeMillis: "1", subscriptionNotification: { version: "1.0", notificationType: 2, purchaseToken: TOKEN, subscriptionId: PRODUCT } };
  return {
    message: {
      data: Buffer.from(JSON.stringify(payload ?? event)).toString("base64"),
      messageId: "m1",
      publishTime: new Date().toISOString(),
    },
    subscription: "projects/x/subscriptions/y",
  };
}

const LATER = "2026-12-20T10:00:00.000Z";
const SOON = "2026-11-25T10:00:00.000Z";

test("a renewal moves Premium to the new date Google gives", async () => {
  const db = fakeDb();
  const billing = fakeBilling();
  const google = fakeGoogle(googleSub({ expiry: LATER }));
  const play = createPlayBilling({ request: google.request, db, billing });

  const result = await play.syncSubscription(TOKEN);
  assert.equal(result.handled, true);
  assert.equal(result.autoRenew, true);
  assert.deepStrictEqual(billing.calls.until, [
    { userId: USER, feature: "pro", expiresAt: new Date(LATER), source: "play" },
  ]);
  assert.equal(db.state.subscriptions[0].auto_renew, 1);
});

test("a cancelled subscription keeps Premium until the paid period ends", async () => {
  const db = fakeDb();
  const billing = fakeBilling();
  const google = fakeGoogle(googleSub({ expiry: SOON, autoRenew: false }));
  const play = createPlayBilling({ request: google.request, db, billing });

  await play.syncSubscription(TOKEN);
  assert.deepStrictEqual(billing.calls.until[0].expiresAt, new Date(SOON));
  assert.equal(db.state.subscriptions[0].auto_renew, 0);
});

test("an expired subscription ends Premium now", async () => {
  const db = fakeDb();
  const billing = fakeBilling();
  const google = fakeGoogle(googleSub({ state: "SUBSCRIPTION_STATE_EXPIRED", expiry: SOON, autoRenew: false }));
  const play = createPlayBilling({ request: google.request, db, billing });

  const before = Date.now();
  await play.syncSubscription(TOKEN);
  const ended = billing.calls.until[0].expiresAt.getTime();
  assert.ok(ended >= before && ended <= Date.now() + 1000, "Premium ends now, not at the old date");
});

test("a token we never granted is ignored without asking Google", async () => {
  const db = fakeDb({ owner: null });
  const billing = fakeBilling();
  const google = fakeGoogle("missing");
  const play = createPlayBilling({ request: google.request, db, billing });

  const result = await play.syncSubscription(TOKEN);
  assert.equal(result.handled, false);
  assert.equal(billing.calls.until.length, 0);
});

test("a notification from Google is read, then checked with Google", async () => {
  const db = fakeDb();
  const billing = fakeBilling();
  const google = fakeGoogle(googleSub({ expiry: LATER }));
  const play = createPlayBilling({ request: google.request, db, billing });

  const result = await play.handleNotification(notification());
  assert.equal(result.handled, true);
  assert.ok(google.calls.some((call) => call.includes(`subscriptionsv2/tokens/${TOKEN}`)));
});

test("a notification for another app is ignored", async () => {
  const db = fakeDb();
  const billing = fakeBilling();
  const google = fakeGoogle("missing");
  const play = createPlayBilling({ request: google.request, db, billing });

  const result = await play.handleNotification(notification(null, { packageName: "com.other.app" }));
  assert.equal(result.handled, false);
});

test("a message that cannot be read is refused with a 400", async () => {
  const db = fakeDb();
  const play = createPlayBilling({ request: fakeGoogle("missing").request, db, billing: fakeBilling() });

  await assert.rejects(
    () => play.handleNotification({ message: { data: Buffer.from("not json").toString("base64") } }),
    (error) => error.status === 400,
  );
  await assert.rejects(() => play.handleNotification({}), (error) => error.status === 400);
});

test("the app can ask the renewal status of its subscription", async () => {
  const db = fakeDb({
    stored: { purchase_token: TOKEN, user_id: USER, product_id: PRODUCT, state: "SUBSCRIPTION_STATE_ACTIVE", auto_renew: 0, expires_at: new Date(SOON), updated_at: new Date() },
  });
  const play = createPlayBilling({ request: fakeGoogle("missing").request, db, billing: fakeBilling() });

  const status = await play.status(USER, PRODUCT);
  assert.equal(status.known, true);
  assert.equal(status.autoRenew, false);
  assert.equal(status.state, "SUBSCRIPTION_STATE_ACTIVE");
  assert.match(status.manageUrl, /sku=pro_monthly&package=com\.apnajoda\.app/);

  const other = await play.status("someone-else", PRODUCT);
  assert.equal(other.known, false);
});

test("the manage link goes to the Play Store subscriptions page", () => {
  assert.equal(
    manageUrl("plus_monthly"),
    "https://play.google.com/store/account/subscriptions?sku=plus_monthly&package=com.apnajoda.app",
  );
});
