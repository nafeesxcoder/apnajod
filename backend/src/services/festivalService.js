/**
 * Festival themes on the whole app, at one click from the admin.
 *
 * The themes (colours, greeting, decoration) are in the app's code; this
 * only keeps which one is on and for how long. "Apply now" starts one at
 * once, "Schedule" sets a start and end ahead of time, "Turn off" ends the
 * one that is on. Members online get the change at once over the socket;
 * the rest pick it up when the app next asks.
 *
 * Times are stored and compared in UTC.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const realtime = require("./realtime");

/** Must match the keys of FESTIVAL_THEMES in the app. */
const THEME_KEYS = [
  "diwali",
  "eid_ul_fitr",
  "eid_ul_adha",
  "holi",
  "christmas",
  "new_year",
  "valentines",
  "raksha_bandhan",
];

const MAX_DAYS = 60;

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** A Date as a UTC "YYYY-MM-DD HH:MM:SS" for a DATETIME column. */
function sqlUtc(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** A DATETIME read back (UTC, no zone) as an ISO string with Z. */
function isoUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return /Z|[+-]\d\d:?\d\d$/.test(text) ? new Date(text).toISOString() : new Date(`${text}Z`).toISOString();
}

function parseTime(value, label) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw fail(400, `${label} is not a valid time`);
  return date;
}

function cleanGreeting(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return text || null;
}

function rowToSchedule(row) {
  return {
    id: row.id,
    themeKey: row.theme_key,
    greeting: row.greeting ?? null,
    startsAt: isoUtc(row.starts_at),
    endsAt: isoUtc(row.ends_at),
  };
}

/** The theme on right now, or null. */
async function active() {
  const [row] = await query(
    `SELECT * FROM festival_schedule
      WHERE cancelled_at IS NULL
        AND starts_at <= UTC_TIMESTAMP()
        AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP())
      ORDER BY starts_at DESC, created_at DESC LIMIT 1`,
  );
  return row ? rowToSchedule(row) : null;
}

/** For the admin: what is on now and what is coming. */
async function listForAdmin() {
  const upcoming = await query(
    `SELECT * FROM festival_schedule
      WHERE cancelled_at IS NULL AND starts_at > UTC_TIMESTAMP()
      ORDER BY starts_at ASC LIMIT 50`,
  );
  return { active: await active(), upcoming: upcoming.map(rowToSchedule), themes: THEME_KEYS };
}

async function announce() {
  const theme = await active();
  realtime.emitToAll("app:theme", { theme });
  return theme;
}

/**
 * Put a theme on. With no startsAt it starts now; with no endsAt it stays
 * on until turned off. Starting now ends whatever was on before.
 */
async function schedule(adminId, { themeKey, greeting, startsAt, endsAt }) {
  if (!THEME_KEYS.includes(themeKey)) throw fail(400, "Unknown festival theme");
  const now = new Date();
  const start = parseTime(startsAt, "Start") ?? now;
  const end = parseTime(endsAt, "End");
  if (end && end <= start) throw fail(400, "The end must be after the start");
  if (end && end <= now) throw fail(400, "The end is already past");
  if (end && end - start > MAX_DAYS * 86400000) throw fail(400, `A theme can run for at most ${MAX_DAYS} days`);
  const startsNow = start <= now;

  if (startsNow) {
    // One theme at a time: the old one ends as the new one starts.
    await query(
      `UPDATE festival_schedule SET ends_at = UTC_TIMESTAMP()
        WHERE cancelled_at IS NULL AND starts_at <= UTC_TIMESTAMP()
          AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP())`,
    );
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO festival_schedule (id, theme_key, greeting, starts_at, ends_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, themeKey, cleanGreeting(greeting), sqlUtc(startsNow ? now : start), end ? sqlUtc(end) : null, adminId ?? null],
  );
  if (startsNow) await announce();
  return { id, startsNow };
}

/** Turn off the theme that is on now. Scheduled ones stay scheduled. */
async function stop() {
  await query(
    `UPDATE festival_schedule SET ends_at = UTC_TIMESTAMP()
      WHERE cancelled_at IS NULL AND starts_at <= UTC_TIMESTAMP()
        AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP())`,
  );
  await announce();
  return { stopped: true };
}

/** Drop a scheduled theme before it starts. */
async function cancel(id) {
  const result = await query(
    `UPDATE festival_schedule SET cancelled_at = UTC_TIMESTAMP()
      WHERE id = ? AND cancelled_at IS NULL AND starts_at > UTC_TIMESTAMP()`,
    [id],
  );
  if ((result?.affectedRows ?? 0) === 0) throw fail(404, "No such upcoming theme");
  return { cancelled: true };
}

module.exports = { THEME_KEYS, MAX_DAYS, active, listForAdmin, schedule, stop, cancel, isoUtc, sqlUtc };
