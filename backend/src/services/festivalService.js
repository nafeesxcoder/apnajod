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
/** The most a festival offer can take off. */
const MAX_OFFER = 50;

/** For the greeting push: the app has the full themes, this is enough. */
const PUSH_WORDS = {
  diwali: { emoji: "🪔", greeting: "Happy Diwali", name: "Diwali" },
  eid_ul_fitr: { emoji: "🌙", greeting: "Eid Mubarak", name: "Eid" },
  eid_ul_adha: { emoji: "🌙", greeting: "Eid al-Adha Mubarak", name: "Eid" },
  holi: { emoji: "🎨", greeting: "Happy Holi", name: "Holi" },
  christmas: { emoji: "🎄", greeting: "Merry Christmas", name: "Christmas" },
  new_year: { emoji: "🎆", greeting: "Happy New Year", name: "New Year" },
  valentines: { emoji: "💖", greeting: "Happy Valentine's Day", name: "Valentine's Day" },
  raksha_bandhan: { emoji: "🧡", greeting: "Happy Raksha Bandhan", name: "Raksha Bandhan" },
};

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

function cleanOffer(value) {
  if (value === null || value === undefined || value === "") return null;
  const percent = Math.round(Number(value));
  if (!Number.isFinite(percent) || percent < 0 || percent > MAX_OFFER) {
    throw fail(400, `An offer can be 0 to ${MAX_OFFER}% off`);
  }
  return percent || null;
}

function rowToSchedule(row) {
  return {
    id: row.id,
    themeKey: row.theme_key,
    greeting: row.greeting ?? null,
    startsAt: isoUtc(row.starts_at),
    endsAt: isoUtc(row.ends_at),
    offerPercent: row.offer_percent ? Number(row.offer_percent) : null,
    pushedAt: isoUtc(row.pushed_at),
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
async function schedule(adminId, { themeKey, greeting, startsAt, endsAt, offerPercent }) {
  if (!THEME_KEYS.includes(themeKey)) throw fail(400, "Unknown festival theme");
  const offer = cleanOffer(offerPercent);
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
    `INSERT INTO festival_schedule (id, theme_key, greeting, starts_at, ends_at, created_by, offer_percent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, themeKey, cleanGreeting(greeting), sqlUtc(startsNow ? now : start), end ? sqlUtc(end) : null, adminId ?? null, offer],
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

/** The Premium offer on now, if the festival on now has one. */
async function offer() {
  const theme = await active();
  if (!theme?.offerPercent) return null;
  return { percent: theme.offerPercent, themeKey: theme.themeKey, endsAt: theme.endsAt };
}

/** Everyone who can get a push: an app token or a browser subscription. */
async function pushAudience() {
  const rows = await query(
    `SELECT DISTINCT t.user_id AS id FROM (
        SELECT user_id FROM device_push_tokens
        UNION SELECT user_id FROM push_subscriptions
      ) t
      JOIN users u ON u.id = t.user_id
     WHERE u.deleted_at IS NULL`,
  );
  return rows.map((row) => row.id);
}

/**
 * "Eid Mubarak! 🌙" to every member, once per festival. Sent in the
 * background a few at a time; the admin gets the number straight away.
 */
async function sendGreetingPush(message) {
  const theme = await active();
  if (!theme) throw fail(409, "Put a festival theme on first.");
  const claimed = await query(
    "UPDATE festival_schedule SET pushed_at = UTC_TIMESTAMP() WHERE id = ? AND pushed_at IS NULL",
    [theme.id],
  );
  if ((claimed?.affectedRows ?? 0) === 0) throw fail(409, "The greeting for this festival has already been sent.");

  const words = PUSH_WORDS[theme.themeKey] ?? { emoji: "✨", greeting: "Happy holidays", name: "festival" };
  const title = `${theme.greeting || words.greeting} ${words.emoji}`;
  const body =
    String(message ?? "").replace(/\s+/g, " ").trim().slice(0, 160) ||
    `Wish your matches today - send a ${words.name} story or a wish in chat 💌`;
  const users = await pushAudience();

  const pushService = require("./pushService");
  void (async () => {
    for (let i = 0; i < users.length; i += 20) {
      await Promise.all(
        users.slice(i, i + 20).map((userId) =>
          pushService.notifyUser(userId, { title, body, data: { type: "festival" } }).catch(() => undefined),
        ),
      );
    }
  })();
  return { sending: users.length };
}

module.exports = {
  THEME_KEYS,
  MAX_DAYS,
  MAX_OFFER,
  active,
  listForAdmin,
  schedule,
  stop,
  cancel,
  offer,
  sendGreetingPush,
  isoUtc,
  sqlUtc,
};
