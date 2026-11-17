/**
 * Premium and boosts bought inside the Android app through Google Play.
 *
 * The phone buys with Google's own payment sheet and gets a purchase token.
 * It sends that token here, and the server checks it with Google before
 * anything is granted. The app is never trusted on its own word.
 *
 * - Subscriptions (Plus, Pro): Google must say the subscription is active
 *   and for this product. We acknowledge it, then grant the plan's days.
 *   Renewals and cancellations are not handled yet; they need Google's
 *   real-time developer notifications, which come later.
 * - Boost packs (consumables): Google must say the purchase is complete.
 *   We grant the credits, then consume the purchase so it can be bought again.
 * - Each token is granted once. A repeat call (the app retries, or the
 *   phone reconnects) does not grant it again.
 * - A token belongs to the member who first sent it. Anyone else who sends
 *   it gets "Purchase not found".
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
const ACTIVE_STATES = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"];

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
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

function createPlayBilling({ request, db, billing }) {
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
    if (plan.kind === "subscription") {
      const sub = await request("GET", `purchases/subscriptionsv2/tokens/${purchaseToken}`);
      const item = (sub.lineItems || []).find((line) => line.productId === productId);
      if (!item || !ACTIVE_STATES.includes(sub.subscriptionState)) {
        throw fail(400, "This subscription is not active.");
      }
      orderId = sub.latestOrderId || null;
      if (sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
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
    if (shouldGrant) {
      await billing.grantPlan(userId, plan, "play");
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

  return { verifyPurchase };
}

const playBilling = createPlayBilling({
  request: googleRequest,
  db: { query },
  billing: billingService,
});

module.exports = { createPlayBilling, playBilling, PRODUCT_ID };
