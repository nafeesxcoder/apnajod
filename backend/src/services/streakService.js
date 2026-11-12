const { query } = require("../config/db");

/**
 * Chat streaks 🔥.
 *
 * A streak is the number of days in a row on which BOTH people sent at
 * least one message - one person talking to themselves does not count.
 * Days are India days, so the count turns over at midnight IST for
 * everyone.
 *
 * If both have spoken today, today counts. If not yet, the streak is still
 * alive from yesterday - it only breaks once a whole day passes without
 * both of them - and `atRisk` says today's part is still missing, so the
 * app can show ⏳ and nudge them to keep it going.
 *
 * Worked out from chat_messages on the fly: nothing new is stored, so it
 * can never drift from the real conversation.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 120;
/** A single day of back-and-forth is just a chat, not a streak yet. */
const MIN_TO_SHOW = 2;

function dayNumber(ms) {
  return Math.floor((ms + IST_OFFSET_MS) / DAY_MS);
}

/**
 * From the set of day numbers on which both people sent something, how
 * long is the streak right now? Pure, so it is tested without a database.
 */
function streakFromDays(days, now = Date.now()) {
  const today = dayNumber(now);
  const bothToday = days.has(today);
  let day = bothToday ? today : today - 1;
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day -= 1;
  }
  return {
    count,
    // Alive but today's half is not done yet.
    atRisk: count > 0 && !bothToday,
    show: count >= MIN_TO_SHOW,
  };
}

const EMPTY = { count: 0, atRisk: false, show: false };

/**
 * Streaks for every conversation this member is in, keyed by storage
 * conversation id ("dm:<a>:<b>"). One query for all of them.
 */
async function forMember(userId, now = Date.now()) {
  // Day numbers are worked out in SQL from created_at_ms, so the server's
  // own time zone never comes into it.
  const rows = await query(
    `SELECT conversation_id,
            FLOOR((created_at_ms + ?) / ?) AS day_number
       FROM chat_messages
      WHERE deleted_for_everyone = 0
        AND created_at_ms > ?
        AND (conversation_id LIKE CONCAT('dm:', ?, ':%')
          OR conversation_id LIKE CONCAT('dm:%:', ?))
      GROUP BY conversation_id, day_number
      HAVING COUNT(DISTINCT sender_id) >= 2`,
    [IST_OFFSET_MS, DAY_MS, now - LOOKBACK_DAYS * DAY_MS, userId, userId],
  );
  const daysByConversation = new Map();
  for (const row of rows) {
    const set = daysByConversation.get(row.conversation_id) ?? new Set();
    set.add(Number(row.day_number));
    daysByConversation.set(row.conversation_id, set);
  }
  const out = new Map();
  for (const [conversationId, days] of daysByConversation) {
    out.set(conversationId, streakFromDays(days, now));
  }
  return out;
}

/** The streak for one conversation, by its storage id. */
async function forConversation(userId, conversationId, now = Date.now()) {
  const all = await forMember(userId, now);
  return all.get(conversationId) ?? EMPTY;
}

module.exports = {
  MIN_TO_SHOW,
  EMPTY,
  dayNumber,
  streakFromDays,
  forMember,
  forConversation,
};
