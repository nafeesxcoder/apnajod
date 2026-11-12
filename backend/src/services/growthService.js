const { query } = require("../config/db");

/**
 * Numbers for the admin Growth page.
 *
 * Every chart is one number per India day over the last 7, 14 or 30 days.
 * Days are India days (IST, UTC+5:30), whatever time zone the database
 * runs in: the offset between the database clock and UTC is read once per
 * request and every timestamp is shifted to IST before it is bucketed.
 *
 * A metric whose table is missing (not migrated yet) reads as zeros rather
 * than breaking the page.
 */
const IST_MINUTES = 330;
const ALLOWED_DAYS = [7, 14, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

function istDay(ms) {
  return new Date(ms + IST_MINUTES * 60 * 1000).toISOString().slice(0, 10);
}

/** The last `count` India days, oldest first, ending today. */
function dayList(count, now = Date.now()) {
  const days = [];
  for (let i = count - 1; i >= 0; i -= 1) days.push(istDay(now - i * DAY_MS));
  return days;
}

function cleanDays(value) {
  const n = Number(value);
  return ALLOWED_DAYS.includes(n) ? n : 14;
}

async function safe(sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    console.log("[GROWTH] query failed:", error.message);
    return [];
  }
}

async function scalar(sql, params = []) {
  const rows = await safe(sql, params);
  return Number(rows?.[0]?.total || 0);
}

/** Minutes to add to a database timestamp to get India time. */
async function shiftToIst() {
  const [row] = await safe("SELECT TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), NOW()) AS m");
  return IST_MINUTES - Math.round(Number(row?.m || 0));
}

/**
 * Per-day counts for one table. `column` is the timestamp to bucket by;
 * `value` is what to add up per row (COUNT by default). Rows older than the
 * window are cut by a plain range first, so an index on the column helps.
 */
async function perDay({ table, column, where = "", value = "COUNT(*)" }, shift, days, firstDay) {
  const windowDays = days.length;
  const dayExpr = `DATE(${column} + INTERVAL ${shift} MINUTE)`;
  const rows = await safe(
    `SELECT ${dayExpr} AS day, ${value} AS n
       FROM ${table}
      WHERE ${column} >= NOW() - INTERVAL ${windowDays + 1} DAY
        ${where ? `AND ${where}` : ""}
      GROUP BY day`,
  );
  return fill(rows, days, firstDay);
}

/** For tables that already store an India day (DATE column). */
async function perStoredDay({ table, column }, days, firstDay) {
  const rows = await safe(
    `SELECT ${column} AS day, COUNT(*) AS n FROM ${table} WHERE ${column} >= ? GROUP BY ${column}`,
    [firstDay],
  );
  return fill(rows, days, firstDay);
}

function dayKey(value) {
  // mysql2 runs with dateStrings, so DATE columns arrive as "YYYY-MM-DD".
  return String(value || "").slice(0, 10);
}

function fill(rows, days, firstDay) {
  const byDay = new Map(rows.map((row) => [dayKey(row.day), Number(row.n || 0)]));
  return days.map((day) => (day >= firstDay ? byDay.get(day) || 0 : 0));
}

const METRICS = {
  signups: { table: "users", column: "created_at" },
  likes: { table: "match_decisions", column: "created_at", where: "decision = 'interested'" },
  matches: { table: "mutual_matches", column: "created_at" },
  messages: { table: "chat_messages", column: "created_at" },
  sparks: { table: "match_sparks", column: "created_at" },
  games: { table: "chat_games", column: "created_at" },
  invites: { table: "referrals", column: "created_at" },
  payments: {
    table: "payments",
    column: "COALESCE(granted_at, updated_at)",
    where: "status = 'paid'",
  },
  revenuePaise: {
    table: "payments",
    column: "COALESCE(granted_at, updated_at)",
    where: "status = 'paid'",
    value: "COALESCE(SUM(amount_paise), 0)",
  },
};

async function getGrowth({ days: requested, now = Date.now() } = {}) {
  const count = cleanDays(requested);
  const days = dayList(count, now);
  const firstDay = days[0];
  const today = days[days.length - 1];
  const shift = await shiftToIst();

  const names = Object.keys(METRICS);
  const [counted, active, dailyQuestion] = await Promise.all([
    Promise.all(names.map((name) => perDay(METRICS[name], shift, days, firstDay))),
    perStoredDay({ table: "member_active_days", column: "day" }, days, firstDay),
    perStoredDay({ table: "daily_question_answers", column: "answered_day" }, days, firstDay),
  ]);
  const series = Object.fromEntries(names.map((name, i) => [name, counted[i]]));
  series.active = active;
  series.dailyQuestion = dailyQuestion;

  const live = "SELECT id FROM users WHERE deleted_at IS NULL";
  const [
    activeToday,
    active7d,
    active30d,
    members,
    withProfile,
    withPhoto,
    verified,
    paidEver,
    activePlus,
    activePro,
    trackingSince,
  ] = await Promise.all([
    scalar("SELECT COUNT(*) AS total FROM member_active_days WHERE day = ?", [today]),
    scalar("SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND last_active_at > NOW() - INTERVAL 7 DAY"),
    scalar("SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND last_active_at > NOW() - INTERVAL 30 DAY"),
    scalar("SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL"),
    scalar(
      `SELECT COUNT(*) AS total FROM profiles
        WHERE user_id IN (${live}) AND TRIM(COALESCE(first_name, '')) <> '' AND age IS NOT NULL`,
    ),
    scalar(`SELECT COUNT(DISTINCT user_id) AS total FROM profile_photos WHERE user_id IN (${live})`),
    scalar(`SELECT COUNT(*) AS total FROM profiles WHERE verified = 1 AND user_id IN (${live})`),
    scalar(`SELECT COUNT(DISTINCT user_id) AS total FROM payments WHERE status = 'paid' AND user_id IN (${live})`),
    scalar(
      `SELECT COUNT(*) AS total FROM entitlements
        WHERE feature = 'premium' AND (expires_at IS NULL OR expires_at > NOW()) AND user_id IN (${live})`,
    ),
    scalar(
      `SELECT COUNT(*) AS total FROM entitlements
        WHERE feature = 'pro' AND (expires_at IS NULL OR expires_at > NOW()) AND user_id IN (${live})`,
    ),
    safe("SELECT MIN(day) AS first FROM member_active_days"),
  ]);

  return {
    days,
    series,
    today: {
      active: activeToday,
      signups: series.signups[count - 1],
      matches: series.matches[count - 1],
      messages: series.messages[count - 1],
      revenuePaise: series.revenuePaise[count - 1],
    },
    active: { today: activeToday, last7Days: active7d, last30Days: active30d },
    funnel: { members, withProfile, withPhoto, verified, paidEver },
    plans: { plus: activePlus, pro: activePro },
    activeTrackingSince: trackingSince?.[0]?.first ? dayKey(trackingSince[0].first) : null,
  };
}

module.exports = { getGrowth, dayList, cleanDays, istDay, METRICS };
