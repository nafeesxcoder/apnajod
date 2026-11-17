/**
 * Premium and boosts bought inside the Android app through Google Play.
 *
 * The phone buys with Google's own payment sheet and gets a purchase token.
 * It sends that token here, and the server checks it with Google before
 * anything is granted. The app is never trusted on its own word.
 *
 * - Subscriptions (Plus, Pro): Google must say the subscription is active
 *   and for this product. We acknowledge it, and Premium runs until the
 *   date Google gives (the renewal date), not a fixed number of days.
 *   Google's real-time notifications keep that date right: a renewal
 *   extends it, a cancellation keeps it until the end of the paid period,
 *   and an expiry or a hold ends it.
 * - Boost packs (consumables): Google must say the purchase is complete.
 *   We grant the credits, then consume the purchase so it can be bought again.
 * - Each token is granted once. A repeat call (the app retries, or the
 *   phone reconnects) does not grant it again.
 * - A token belongs to the member who first sent it. Anyone else who sends
 *   it gets "Purchase not found".
 * - Auto-renew cannot be switched off from inside the app: Google only lets
 *   the member do that on the Play Store. We show the status and link there.
 *
 * Needs PLAY_SERVICE_ACCOUNT_FILE: the path to the service account JSON on
 * the server. That file is never in the repo and never sent to the app.
 */
const { GoogleAuth } = require("google-auth-library");
const { query } = require("../config/db");
const billingService = require("./billingService");

const PACKAGE_NAME = "com.apnajoda.app";
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/`;
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const PRODUCT_ID = /^[a-z0-9_.]{1,40}$/;
const LIVE_STATES = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"];

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Where a member manages (or cancels) a subscription on Google Play. */
function manageUrl(productId) {
  return `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(productId)}&package=${PACKAGE_NAME}`;
}

/** The real Google call. Throws a 502 with a plain message if Google says no. */
let auth = null;
async function googleRequest(method, path, data) {
  if (!process.env.PLAY_SERVICE_ACCOUNT_FILE) {
    throw fail(503, "Google Play checkout is not set up on the server yet.");
  }
  auth = auth || new GoogleAuth({ keyFile: process.env.PLAY_SERVICE_ACCOUNT_FILE, scopes: [SCOPE] });
  try {
    const client = await auth.getClient();
    const res = await client.request({ url: API + path, method, data });
    return res.data;
  } catch (error) {
    if (error?.status && error.status < 500) throw fail(502, "Google Play could not confirm this purchase.");
    throw fail(502, "Google Play is not reachable right now. Try again in a minute.");
  }
}

/** What one subscription looks like, as Google reports it. */
function summarise(sub, productId) {
  const item = (sub.lineItems || []).find((line) => line.productId === productId) || null;
  return {
    item,
    live: !!item && LIVE_STATES.includes(sub.subscriptionState),
    state: sub.subscriptionState || "UNKNOWN",
    autoRenew: !!item?.autoRenewingPlan?.autoRenewEnabled,
    expiresAt: item?.expiryTime ? new Date(item.expiryTime) : null,
    orderId: sub.latestOrderId || null,
    acknowledged: sub.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_PENDING",
  };
}

function createPlayBilling({ request, db, billing }) {
  async function saveSubscription(userId, purchaseToken, productId, s) {
    await db.query(
      `INSERT INTO play_subscriptions (purchase_token, user_id, product_id, state, auto_renew, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE state = VALUES(state), auto_renew = VALUES(auto_renew), expires_at = VALUES(expires_at)`,
      [purchaseToken, userId, productId, s.state, s.autoRenew ? 1 : 0, s.expiresAt],
    );
  }

  /**
   * Check one purchase with Google and grant it. Returns whether Premium or
   * the boosts are now on, and the member's billing summary.
   */
  async function verifyPurchase(userId, input) {
    const productId = String(input?.productId || "");
    const purchaseToken = String(input?.purchaseToken || "");
    if (!PRODUCT_ID.test(productId)) throw fail(400, "That product is not recognised.");
    if (purchaseToken.length < 10 || purchaseToken.length > 512) {
      throw fail(400, "That purchase is not recognised.");
    }

    const [plan] = await db.query(
      "SELECT code, kind, grants, quantity FROM billing_plans WHERE play_product_id = ? AND active = 1",
      [productId],
    );
    if (!plan) throw fail(404, "That product is not on sale.");

    const [owned] = await db.query(
      "SELECT user_id, granted_at FROM play_purchases WHERE purchase_token = ?",
      [purchaseToken],
    );
    if (owned && owned.user_id !== userId) throw fail(404, "Purchase not found.");

    // What Google says about this purchase, and the steps still owed to it.
    let orderId = null;
    let consumeAfter = false;
    let subscription = null;
    if (plan.kind === "subscription") {
      const sub = await request("GET", `purchases/subscriptionsv2/tokens/${purchaseToken}`);
      subscription = summarise(sub, productId);
      if (!subscription.item || !subscription.live) {
        throw fail(400, "This subscription is not active.");
      }
      orderId = subscription.orderId;
      if (!subscription.acknowledged) {
        await request("POST", `purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`, {});
      }
    } else {
      const purchase = await request("GET", `purchases/products/${productId}/tokens/${purchaseToken}`);
      const purchased = purchase.purchaseState === 0 || purchase.purchaseState === "PURCHASED";
      if (!purchased) throw fail(400, "This purchase is not complete.");
      orderId = purchase.orderId || null;
      const consumed = purchase.consumptionState === 1 || purchase.consumptionState === "CONSUMED";
      consumeAfter = !consumed;
    }

    // Claim the token first. A second request that lost the race finds the
    // row and does not grant again.
    let shouldGrant;
    if (owned) {
      // An earlier call recorded the token. Grant only if that call never finished.
      shouldGrant = !owned.granted_at;
    } else {
      const claim = await db.query(
        `INSERT IGNORE INTO play_purchases (purchase_token, user_id, plan_code, product_id, order_id)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseToken, userId, plan.code, productId, orderId],
      );
      shouldGrant = claim.affectedRows === 1;
    }

    if (subscription) {
      await saveSubscription(userId, purchaseToken, productId, subscription);
    }
    if (subscription?.expiresAt) {
      // Google's own end date, so a renewal later on moves it forward.
      await billing.setFeatureUntil(userId, plan.grants, subscription.expiresAt, "play");
    } else if (shouldGrant) {
      await billing.grantPlan(userId, plan, "play");
    }
    if (shouldGrant) {
      await db.query(
        "UPDATE play_purchases SET granted_at = UTC_TIMESTAMP(6) WHERE purchase_token = ?",
        [purchaseToken],
      );
    }

    if (consumeAfter) {
      await request("POST", `purchases/products/${productId}/tokens/${purchaseToken}:consume`, {});
    }

    return {
      granted: true,
      billing: await billing.summaryFor(userId),
    };
  }

  /**
   * Ask Google for the subscription's current state and bring our records in
   * line with it. Used for every renewal, cancellation, expiry or hold.
   */
  async function syncSubscription(purchaseToken) {
    const [owner] = await db.query(
      "SELECT user_id, plan_code, product_id FROM play_purchases WHERE purchase_token = ?",
      [purchaseToken],
    );
    if (!owner) return { handled: false };

    const [plan] = await db.query(
      "SELECT code, kind, grants FROM billing_plans WHERE code = ?",
      [owner.plan_code],
    );
    const sub = await request("GET", `purchases/subscriptionsv2/tokens/${purchaseToken}`);
    const s = summarise(sub, owner.product_id);
    if (!s.item) return { handled: false };

    await saveSubscription(owner.user_id, purchaseToken, owner.product_id, s);
    if (plan?.kind === "subscription") {
      if (s.live && s.expiresAt) {
        await billing.setFeatureUntil(owner.user_id, plan.grants, s.expiresAt, "play");
      } else if (!s.live) {
        // Expired, on hold, paused or revoked: no access from now.
        await billing.setFeatureUntil(owner.user_id, plan.grants, new Date(), "play");
      }
    }
    return { handled: true, state: s.state, autoRenew: s.autoRenew, expiresAt: s.expiresAt };
  }

  /**
   * One message from Google's real-time developer notifications (Pub/Sub).
   * The message only says "something changed"; the truth comes from Google
   * when we ask for the subscription.
   */
  async function handleNotification(body) {
    const data = body?.message?.data;
    if (!data) throw fail(400, "No notification in the message.");
    let event;
    try {
      event = JSON.parse(Buffer.from(String(data), "base64").toString("utf8"));
    } catch {
      throw fail(400, "The notification could not be read.");
    }
    if (event.packageName && event.packageName !== PACKAGE_NAME) return { handled: false };
    const purchaseToken = event.subscriptionNotification?.purchaseToken;
    if (!purchaseToken) return { handled: false };
    return syncSubscription(purchaseToken);
  }

  /** What the app shows for one subscription: state, renewal date, where to manage it. */
  async function status(userId, productId) {
    if (!PRODUCT_ID.test(String(productId || ""))) throw fail(400, "That product is not recognised.");
    const [row] = await db.query(
      `SELECT state, auto_renew, expires_at FROM play_subscriptions
        WHERE user_id = ? AND product_id = ?
        ORDER BY updated_at DESC LIMIT 1`,
      [userId, productId],
    );
    return {
      known: !!row,
      state: row?.state ?? null,
      autoRenew: !!row?.auto_renew,
      expiresAt: row?.expires_at ? new Date(row.expires_at).toISOString() : null,
      manageUrl: manageUrl(productId),
    };
  }

  return { verifyPurchase, syncSubscription, handleNotification, status };
}

const playBilling = createPlayBilling({
  request: googleRequest,
  db: { query },
  billing: billingService,
});

module.exports = { createPlayBilling, playBilling, PRODUCT_ID, manageUrl };
