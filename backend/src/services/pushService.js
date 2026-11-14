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

/* ---------------- Phone app (Expo push) ---------------- */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** "ExponentPushToken[...]" / "ExpoPushToken[...]" - what the app gets from Expo. */
function isExpoToken(token) {
  return typeof token === "string" && token.length <= 255 && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

async function saveDeviceToken(userId, token, platform) {
  if (!isExpoToken(token)) {
    const err = new Error("A valid device push token is required.");
    err.status = 400;
    throw err;
  }
  const os = ["android", "ios"].includes(platform) ? platform : "android";
  // One phone, one account: a token moves to whoever signed in last.
  await query(
    `INSERT INTO device_push_tokens (token, user_id, platform) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform)`,
    [token, userId, os],
  );
  return { ok: true };
}

async function removeDeviceToken(userId, token) {
  if (!token) return { ok: true };
  await query("DELETE FROM device_push_tokens WHERE user_id = ? AND token = ?", [userId, String(token)]);
  return { ok: true };
}

/**
 * The messages Expo's push service takes: title and body shown, the rest
 * (which chat or post it is about) handed to the app when it is tapped.
 */
function expoMessages(tokens, payload) {
  const { title, body, data, ...rest } = payload || {};
  const extra = { ...(data && typeof data === "object" ? data : {}), ...rest };
  return tokens.map((to) => ({
    to,
    title: title || "Apnajoda",
    body: body || "",
    data: extra,
    // A chat set to Silent: no sound, on Android's quiet channel.
    sound: extra.silent ? null : "default",
    priority: "high",
    channelId: extra.silent ? "quiet" : "default",
  }));
}

async function notifyDevices(userId, payload) {
  const rows = await query("SELECT token FROM device_push_tokens WHERE user_id = ?", [userId]);
  if (!rows.length) return;
  const tokens = rows.map((row) => row.token);
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(expoMessages(tokens, payload)),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => ({}));
    const tickets = Array.isArray(result.data) ? result.data : [];
    // A phone that no longer has the app: forget its token.
    const gone = tickets
      .map((ticket, index) => (ticket?.details?.error === "DeviceNotRegistered" ? tokens[index] : null))
      .filter(Boolean);
    if (gone.length) {
      await query(`DELETE FROM device_push_tokens WHERE token IN (${gone.map(() => "?").join(", ")})`, gone);
    }
    console.log(`[PUSH APP] to user ${userId}: ${tickets.filter((t) => t?.status === "ok").length}/${tokens.length}`);
  } catch (error) {
    console.log(`[PUSH APP FAILED] to user ${userId}: ${error.message}`);
  }
}

async function notifyUser(userId, payload) {
  // The phone app first - it does not need the website's VAPID keys.
  await notifyDevices(userId, payload);
  if (!env.push.publicKey || !env.push.privateKey) {
    console.log("[PUSH SKIPPED] VAPID keys are not set in .env");
    return;
  }
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
      console.log(`[PUSH SENT] to user ${userId}`);
    } catch (error) {
      console.log(
        `[PUSH FAILED] to user ${userId}: ${error.statusCode || ""} ${error.body || error.message}`,
      );
      if (error.statusCode === 404 || error.statusCode === 410) {
        await query("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]);
      }
    }
  }
}

module.exports = {
  saveSubscription,
  removeSubscription,
  notifyUser,
  saveDeviceToken,
  removeDeviceToken,
  isExpoToken,
  expoMessages,
};
