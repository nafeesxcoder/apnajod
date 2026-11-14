/**
 * The offer popup: "50% OFF Premium" on screen each time the app opens,
 * until the member closes it. The admin writes it (big headline, title,
 * message, button, an optional coupon and a style), turns it on and off,
 * and can give it an end time - the popup counts down to it.
 *
 * One popup is on at a time. Members online get it at once over the socket.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const realtime = require("./realtime");

/** Must match PROMO_STYLES in the app. */
const STYLES = ["classic", "gold", "midnight", "sunset", "love", "diwali", "eid", "holi"];

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function clean(value, max) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

function isoUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(/Z|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`).toISOString();
}

function rowToPromo(row) {
  return {
    id: row.id,
    headline: row.headline,
    title: row.title ?? null,
    message: row.message ?? null,
    buttonLabel: row.button_label ?? null,
    couponCode: row.coupon_code ?? null,
    style: STYLES.includes(row.style) ? row.style : "classic",
    endsAt: isoUtc(row.ends_at),
    active: !!Number(row.active),
  };
}

/** The popup on now, or null. One that has passed its end is off. */
async function active() {
  const [row] = await query(
    `SELECT * FROM promo_popups
      WHERE active = 1 AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP())
      ORDER BY updated_at DESC LIMIT 1`,
  );
  return row ? rowToPromo(row) : null;
}

/** For the admin: the latest few, the one on now first. */
async function listForAdmin() {
  const rows = await query("SELECT * FROM promo_popups ORDER BY active DESC, updated_at DESC LIMIT 10");
  return { active: await active(), popups: rows.map(rowToPromo), styles: STYLES };
}

async function announce() {
  realtime.emitToAll("app:promo", { promo: await active() });
}

/** Save the popup and put it on (it replaces the one on before). */
async function publish(input) {
  const headline = clean(input?.headline, 40);
  if (!headline) throw fail(400, "Write the big headline, like 50% OFF");
  const style = STYLES.includes(input?.style) ? input.style : "classic";
  let endsAt = null;
  if (input?.endsAt) {
    const date = new Date(input.endsAt);
    if (Number.isNaN(date.getTime())) throw fail(400, "The end time is not valid");
    if (date <= new Date()) throw fail(400, "The end time is already past");
    endsAt = date.toISOString().slice(0, 19).replace("T", " ");
  }
  const couponCode = input?.couponCode
    ? String(input.couponCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || null
    : null;
  if (couponCode) {
    const [coupon] = await query("SELECT id FROM coupons WHERE code = ?", [couponCode]);
    if (!coupon) throw fail(400, `There is no coupon ${couponCode}. Make it in Coupons first.`);
  }
  const id = crypto.randomUUID();
  await query("UPDATE promo_popups SET active = 0 WHERE active = 1");
  await query(
    `INSERT INTO promo_popups (id, headline, title, message, button_label, coupon_code, style, ends_at, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      headline,
      clean(input?.title, 80),
      clean(input?.message, 200),
      clean(input?.buttonLabel, 40),
      couponCode,
      style,
      endsAt,
    ],
  );
  await announce();
  return { id };
}

async function stop() {
  await query("UPDATE promo_popups SET active = 0 WHERE active = 1");
  await announce();
  return { stopped: true };
}

module.exports = { STYLES, active, listForAdmin, publish, stop };
