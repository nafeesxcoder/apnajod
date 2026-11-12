const { query } = require("../config/db");
const pushService = require("./pushService");

/**
 * "Your turn" - a nudge when someone is waiting for a reply.
 *
 * A lot of matches go quiet because the message got buried, not because
 * the person lost interest. So when the last message in a chat is from
 * the other person and it has sat unanswered for a few hours, the one who
 * owes a reply gets a single, polite push.
 *
 * It is careful not to become spam:
 *   - one reminder per message, ever (the table's primary key)
 *   - at most one reminder per person every 12 hours, across all chats
 *   - nothing after 2 days - by then the moment has passed
 *   - nothing for muted chats, blocked pairs, or closed accounts
 *
 * Runs inside the backend process every 15 minutes (see server.js), so
 * there is no cron to install. REPLY_REMINDERS=off switches it off.
 */
const HOUR_MS = 60 * 60 * 1000;
const WAIT_MS = 6 * HOUR_MS;
const GIVE_UP_MS = 48 * HOUR_MS;
const PER_PERSON_GAP_HOURS = 12;
const BATCH = 200;

function otherParticipant(conversationId, senderId) {
  const [kind, a, b] = String(conversationId).split(":");
  if (kind !== "dm" || !a || !b) return null;
  if (a === senderId) return b;
  if (b === senderId) return a;
  return null;
}

function isMuted(rawSettings, now) {
  let settings = rawSettings;
  if (typeof rawSettings === "string") {
    try {
      settings = JSON.parse(rawSettings);
    } catch {
      settings = {};
    }
  }
  if (!settings || typeof settings !== "object") return false;
  if (settings.notificationMode === "muted") return true;
  return !!settings.mutedUntil && Number(settings.mutedUntil) > now;
}

/** Chats whose last message has waited long enough and not been reminded about. */
async function findWaiting(now) {
  return query(
    `SELECT m.conversation_id, m.id, m.sender_id
       FROM chat_messages m
       JOIN (
         SELECT conversation_id, MAX(created_at_ms) AS last_ms
           FROM chat_messages
          WHERE deleted_for_everyone = 0
            AND created_at_ms > ?
          GROUP BY conversation_id
       ) latest
         ON latest.conversation_id = m.conversation_id
        AND latest.last_ms = m.created_at_ms
      WHERE m.deleted_for_everyone = 0
        AND m.created_at_ms BETWEEN ? AND ?
        AND m.conversation_id LIKE 'dm:%'
        AND NOT EXISTS (
          SELECT 1 FROM chat_reply_reminders r
           WHERE r.conversation_id = m.conversation_id AND r.message_id = m.id
        )
      ORDER BY m.created_at_ms ASC
      LIMIT ${BATCH}`,
    [now - GIVE_UP_MS, now - GIVE_UP_MS, now - WAIT_MS],
  );
}

async function shouldRemind(row, recipientId, now) {
  const [recipient] = await query(
    "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL AND deactivated_at IS NULL",
    [recipientId],
  );
  if (!recipient) return false;

  const [blocked] = await query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1`,
    [recipientId, row.sender_id, row.sender_id, recipientId],
  );
  if (blocked) return false;

  const [settings] = await query(
    "SELECT settings FROM chat_conversation_settings WHERE conversation_id = ? AND user_id = ?",
    [row.conversation_id, recipientId],
  );
  if (settings && isMuted(settings.settings, now)) return false;

  const [recent] = await query(
    `SELECT 1 FROM chat_reply_reminders
      WHERE recipient_id = ? AND sent_at > UTC_TIMESTAMP(6) - INTERVAL ${PER_PERSON_GAP_HOURS} HOUR
      LIMIT 1`,
    [recipientId],
  );
  return !recent;
}

/** One pass. Returns how many reminders went out. */
async function runOnce(now = Date.now()) {
  const waiting = await findWaiting(now);
  let sent = 0;
  for (const row of waiting) {
    const recipientId = otherParticipant(row.conversation_id, row.sender_id);
    if (!recipientId) continue;
    if (!(await shouldRemind(row, recipientId, now))) continue;

    // Claim the message first. If another run got there, this inserts
    // nothing and we stop - the push is never sent twice.
    const claim = await query(
      `INSERT IGNORE INTO chat_reply_reminders (conversation_id, message_id, recipient_id)
       VALUES (?, ?, ?)`,
      [row.conversation_id, row.id, recipientId],
    );
    if ((claim?.affectedRows ?? 0) === 0) continue;

    const [profile] = await query("SELECT first_name FROM profiles WHERE user_id = ?", [
      row.sender_id,
    ]);
    const name = profile?.first_name || "Your match";
    await pushService
      .notifyUser(recipientId, {
        title: `${name} is waiting for your reply 💬`,
        body: "It's your turn - say something back and keep it going.",
        // Chats are addressed by the other person's id.
        conversationId: row.sender_id,
        data: { type: "reply_reminder", userId: row.sender_id },
      })
      .catch(() => undefined);
    sent += 1;
  }
  return sent;
}

/** Start the 15-minute loop. Returns a stop function. */
function start({ everyMs = 15 * 60 * 1000 } = {}) {
  if (String(process.env.REPLY_REMINDERS || "").toLowerCase() === "off") {
    return () => undefined;
  }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const sent = await runOnce();
      if (sent) console.log(`[reply-reminders] sent ${sent}`);
    } catch (error) {
      console.error("[reply-reminders] failed:", error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, everyMs);
  if (typeof timer.unref === "function") timer.unref();
  // First pass a minute after boot, not during it.
  const first = setTimeout(tick, 60 * 1000);
  if (typeof first.unref === "function") first.unref();
  return () => {
    clearInterval(timer);
    clearTimeout(first);
  };
}

module.exports = {
  WAIT_MS,
  GIVE_UP_MS,
  otherParticipant,
  isMuted,
  runOnce,
  start,
};
