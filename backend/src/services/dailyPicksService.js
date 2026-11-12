const { query } = require("../config/db");
const pushService = require("./pushService");
const profileService = require("./profileService");

/**
 * Aaj ke 5 - five hand-picked profiles a day.
 *
 * A fresh set lands at 9 PM India time, the same moment every day, so
 * opening the app at night becomes a habit. The set is built the first
 * time a member asks for it after 9 PM - there is no job that builds
 * everyone's in advance - and kept for the whole day, so liking or passing
 * on a pick does not make it vanish from the five.
 *
 * Picks come from the same pool as the deck (preferences, blocks and past
 * decisions already applied) and are ranked by what the two share, with
 * anyone picked in the last week left out so the five keep changing.
 */
const PICKS_PER_DAY = 5;
const POOL_SIZE = 50;
const ROLLOVER_HOUR_IST = 21;
const IST_OFFSET_MS = 330 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NO_REPEAT_DAYS = 7;

/**
 * The pick day this moment belongs to. It changes at 9 PM IST, so 9 PM on
 * the 12th to 9 PM on the 13th is pick day "the 13th".
 */
function pickDay(now = new Date()) {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS + (24 - ROLLOVER_HOUR_IST) * HOUR_MS);
  return shifted.toISOString().slice(0, 10);
}

/** When the next set arrives (the next 9 PM IST), as a Date. */
function nextPicksAt(now = new Date()) {
  const day = pickDay(now);
  // Midnight IST of `day`, minus three hours, is when this set started.
  const started = Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS - (24 - ROLLOVER_HOUR_IST) * HOUR_MS;
  return new Date(started + DAY_MS);
}

function parseCard(raw) {
  if (raw && typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function lower(list) {
  return new Set((Array.isArray(list) ? list : []).map((item) => String(item).toLowerCase()));
}

/** How good a pick someone is for this member. Higher is better. */
function score(candidate, me) {
  let points = 0;
  const mine = lower(me.hobbies);
  for (const hobby of candidate.hobbies || []) {
    if (mine.has(String(hobby).toLowerCase())) points += 3;
  }
  const myCity = String(me.city || "").split(",")[0].trim().toLowerCase();
  const theirCity = String(candidate.city || "").split(",")[0].trim().toLowerCase();
  if (myCity && myCity === theirCity) points += 2;
  if (me.intent && candidate.intent && me.intent === candidate.intent) points += 3;
  if (candidate.verified) points += 2;
  if (candidate.photo) points += 2;
  if (candidate.about) points += 1;
  return points;
}

/** Pick five from the pool. Pure, so it can be tested without a database. */
function choose(pool, me, recentlyPicked = new Set()) {
  return pool
    .filter((candidate) => !candidate.offPreference)
    .filter((candidate) => candidate.photo)
    .filter((candidate) => !recentlyPicked.has(candidate.id))
    .map((candidate, index) => ({ candidate, points: score(candidate, me), index }))
    // Highest score first; the deck's own order breaks ties.
    .sort((a, b) => b.points - a.points || a.index - b.index)
    .slice(0, PICKS_PER_DAY)
    .map((entry) => entry.candidate);
}

async function aboutMe(userId) {
  const [profile] = await query("SELECT city, hobbies FROM profiles WHERE user_id = ?", [userId]);
  const [intent] = await query("SELECT intent FROM profile_intent WHERE user_id = ?", [userId]);
  let hobbies = profile?.hobbies;
  if (typeof hobbies === "string") {
    try {
      hobbies = JSON.parse(hobbies);
    } catch {
      hobbies = [];
    }
  }
  return {
    city: profile?.city || "",
    hobbies: Array.isArray(hobbies) ? hobbies : [],
    intent: intent?.intent || "",
  };
}

async function buildSet(userId, day) {
  const [pool, me, recentRows] = await Promise.all([
    profileService.findMatches(userId, POOL_SIZE),
    aboutMe(userId),
    query(
      `SELECT DISTINCT target_id FROM daily_picks
        WHERE user_id = ? AND pick_day >= DATE_SUB(?, INTERVAL ${NO_REPEAT_DAYS} DAY)`,
      [userId, day],
    ),
  ]);
  const recent = new Set(recentRows.map((row) => row.target_id));
  let picks = choose(pool, me, recent);
  // A small city may run out of new faces - repeat older picks rather than
  // show fewer than five.
  if (picks.length < PICKS_PER_DAY) picks = choose(pool, me);

  for (let position = 0; position < picks.length; position += 1) {
    const card = picks[position];
    // INSERT IGNORE: if another request built the set a moment ago, its
    // rows win and these are dropped.
    await query(
      `INSERT IGNORE INTO daily_picks (user_id, pick_day, position, target_id, card)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, day, position, card.id, JSON.stringify(card)],
    );
  }
}

async function readSet(userId, day) {
  return query(
    `SELECT dp.target_id, dp.card,
            d.decision
       FROM daily_picks dp
       JOIN users u
         ON u.id = dp.target_id
        AND u.deleted_at IS NULL
        AND u.deactivated_at IS NULL
       LEFT JOIN match_decisions d
         ON d.actor_id = dp.user_id AND d.target_id = dp.target_id
      WHERE dp.user_id = ? AND dp.pick_day = ?
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
           WHERE (b.blocker_id = dp.user_id AND b.blocked_id = dp.target_id)
              OR (b.blocker_id = dp.target_id AND b.blocked_id = dp.user_id)
        )
      ORDER BY dp.position ASC`,
    [userId, day],
  );
}

/** Today's five for this member, building them if this is the first ask. */
async function forMember(userId, now = new Date()) {
  const day = pickDay(now);
  let rows = await readSet(userId, day);
  if (!rows.length) {
    const [already] = await query(
      "SELECT 1 FROM daily_picks WHERE user_id = ? AND pick_day = ? LIMIT 1",
      [userId, day],
    );
    // Only build once per day. If every pick has since been blocked or
    // closed, they get fewer than five today - not a second set.
    if (!already) {
      await buildSet(userId, day);
      rows = await readSet(userId, day);
    }
  }
  return {
    day,
    nextAt: nextPicksAt(now).toISOString(),
    picks: rows
      .map((row) => {
        const card = parseCard(row.card);
        if (!card) return null;
        return { ...card, pickStatus: row.decision || "new" };
      })
      .filter(Boolean),
  };
}

/* ---------- the 9 PM push ---------- */

/**
 * After 9 PM IST, tell members who were active in the last week that their
 * picks are ready - once a day each. Runs every 10 minutes from server.js;
 * it does nothing before 9 PM and nothing twice.
 */
async function notifyOnce(now = new Date(), batch = 300) {
  const istHour = new Date(now.getTime() + IST_OFFSET_MS).getUTCHours();
  // Only in the evening window, so a late restart at 3 AM does not wake anyone.
  if (istHour < ROLLOVER_HOUR_IST || istHour > 23) return 0;
  const day = pickDay(now);
  const users = await query(
    `SELECT u.id FROM users u
      WHERE u.deleted_at IS NULL
        AND u.deactivated_at IS NULL
        AND u.last_active_at > NOW(6) - INTERVAL 7 DAY
        AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = u.id)
        AND NOT EXISTS (
          SELECT 1 FROM daily_pick_notices n WHERE n.user_id = u.id AND n.pick_day = ?
        )
      LIMIT ${Number(batch)}`,
    [day],
  );
  let sent = 0;
  for (const user of users) {
    const claim = await query(
      "INSERT IGNORE INTO daily_pick_notices (user_id, pick_day) VALUES (?, ?)",
      [user.id, day],
    );
    if ((claim?.affectedRows ?? 0) === 0) continue;
    await pushService
      .notifyUser(user.id, {
        title: "Aaj ke 5 are here ✨",
        body: "Five profiles picked just for you tonight. Take a look.",
        data: { type: "daily_picks" },
      })
      .catch(() => undefined);
    sent += 1;
  }
  return sent;
}

function start({ everyMs = 10 * 60 * 1000 } = {}) {
  if (String(process.env.DAILY_PICKS_PUSH || "").toLowerCase() === "off") {
    return () => undefined;
  }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const sent = await notifyOnce();
      if (sent) console.log(`[daily-picks] notified ${sent}`);
    } catch (error) {
      console.error("[daily-picks] failed:", error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, everyMs);
  if (typeof timer.unref === "function") timer.unref();
  return () => clearInterval(timer);
}

module.exports = {
  PICKS_PER_DAY,
  pickDay,
  nextPicksAt,
  score,
  choose,
  forMember,
  notifyOnce,
  start,
};
