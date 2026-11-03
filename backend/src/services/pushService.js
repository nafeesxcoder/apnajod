const crypto = require("crypto");
const webpush = require("web-push");
const { query } = require("../config/db");
const env = require("../config/env");

if (env.push.publicKey && env.push.privateKey) {
  webpush.setVapidDetails(
    env.push.subject,
    env.push.publicKey,
    env.push.privateKey,
  );
}

async function saveSubscription(userId, subscription) {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    const err = new Error("A valid push subscription is required.");
    err.status = 400;
    throw err;
  }
  await query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [crypto.randomUUID(), userId, endpoint, p256dh, auth],
  );
  return { ok: true };
}

async function removeSubscription(userId, endpoint) {
  if (!endpoint) return { ok: true };
  await query(
    "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
    [userId, endpoint],
  );
  return { ok: true };
}

async function notifyUser(userId, payload) {
  if (!env.push.publicKey || !env.push.privateKey) return;
  const subs = await query(
    "SELECT * FROM push_subscriptions WHERE user_id = ?",
    [userId],
  );
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await query("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]);
      }
    }
  }
}

module.exports = { saveSubscription, removeSubscription, notifyUser };
