/**
 * Coupons the admin writes (DIWALI50 and the like).
 *
 * - The admin picks the code, the percent off, until when and how many
 *   members can use it, and can switch it on and off.
 * - "Show at payment" puts it in front of everyone who pays, already
 *   applied; otherwise only people who know the code can use it.
 * - A member can use a coupon once. It counts as used when the payment is
 *   approved; while a payment with it is waiting, it cannot be used again.
 * - Coupons are for the Premium plans, not Boost or Super Like packs.
 * - With a festival offer on as well, the member gets whichever is cheaper.
 *
 * The price is always worked out here, on the server - the app only sends
 * the code.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const billingService = require("./billingService");

const MIN_PERCENT = 5;
const MAX_PERCENT = 90;

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** "diwali 50" -> "DIWALI50". Letters and digits, 3 to 20 of them. */
function normalizeCode(raw) {
  const code = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length >= 3 && code.length <= 20 ? code : null;
}

function sqlUtc(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function isoUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(/Z|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`).toISOString();
}

function rowToCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    percent: Number(row.percent),
    validUntil: isoUtc(row.valid_until),
    maxUses: row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses),
    active: !!Number(row.active),
    showAtCheckout: !!Number(row.show_at_checkout),
    uses: Number(row.uses ?? 0),
    waiting: Number(row.waiting ?? 0),
  };
}

const LIVE = `active = 1 AND (valid_until IS NULL OR valid_until > UTC_TIMESTAMP())`;

async function list() {
  const rows = await query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id) AS uses,
            (SELECT COUNT(*) FROM payments p WHERE p.coupon_code = c.code AND p.status IN ('pending','created')) AS waiting
       FROM coupons c ORDER BY c.created_at DESC LIMIT 200`,
  );
  return rows.map(rowToCoupon);
}

async function create(adminId, input) {
  const code = normalizeCode(input?.code);
  if (!code) throw fail(400, "A coupon code is 3 to 20 letters or numbers, like DIWALI50");
  const percent = Math.round(Number(input?.percent));
  if (!Number.isFinite(percent) || percent < MIN_PERCENT || percent > MAX_PERCENT) {
    throw fail(400, `A coupon can be ${MIN_PERCENT} to ${MAX_PERCENT}% off`);
  }
  let validUntil = null;
  if (input?.validUntil) {
    const date = new Date(input.validUntil);
    if (Number.isNaN(date.getTime())) throw fail(400, "The end date is not valid");
    if (date <= new Date()) throw fail(400, "The end date is already past");
    validUntil = sqlUtc(date);
  }
  let maxUses = null;
  if (input?.maxUses !== null && input?.maxUses !== undefined && input?.maxUses !== "") {
    maxUses = Math.round(Number(input.maxUses));
    if (!Number.isFinite(maxUses) || maxUses < 1) throw fail(400, "How many members: 1 or more, or leave it empty");
  }
  const showAtCheckout = input?.showAtCheckout ? 1 : 0;
  const id = crypto.randomUUID();
  try {
    if (showAtCheckout) await query("UPDATE coupons SET show_at_checkout = 0");
    await query(
      `INSERT INTO coupons (id, code, percent, valid_until, max_uses, active, show_at_checkout, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, code, percent, validUntil, maxUses, showAtCheckout, adminId ?? null],
    );
  } catch (error) {
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      throw fail(409, `${code} already exists. Pick another code.`);
    }
    throw error;
  }
  return { id, code };
}

/** On/off, and whether it shows at payment (only one coupon does). */
async function update(id, input) {
  const [row] = await query("SELECT * FROM coupons WHERE id = ?", [id]);
  if (!row) throw fail(404, "No such coupon");
  if (input?.active !== undefined) {
    await query("UPDATE coupons SET active = ? WHERE id = ?", [input.active ? 1 : 0, id]);
  }
  if (input?.showAtCheckout !== undefined) {
    if (input.showAtCheckout) await query("UPDATE coupons SET show_at_checkout = 0 WHERE id <> ?", [id]);
    await query("UPDATE coupons SET show_at_checkout = ? WHERE id = ?", [input.showAtCheckout ? 1 : 0, id]);
  }
  return { updated: true };
}

/**
 * The coupon if this member can use it now, else a clear reason.
 */
async function usable(rawCode, userId) {
  const code = normalizeCode(rawCode);
  if (!code) throw fail(400, "That coupon code is not right.");
  const [coupon] = await query("SELECT * FROM coupons WHERE code = ?", [code]);
  if (!coupon || !Number(coupon.active)) throw fail(404, "That coupon code is not right.");
  if (coupon.valid_until && new Date(isoUtc(coupon.valid_until)) <= new Date()) {
    throw fail(410, "This coupon has ended.");
  }
  const [used] = await query(
    "SELECT COUNT(*) AS total FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?",
    [coupon.id, userId],
  );
  if (Number(used?.total ?? 0) > 0) throw fail(409, "You have already used this coupon.");
  const [waiting] = await query(
    `SELECT COUNT(*) AS total FROM payments
      WHERE user_id = ? AND coupon_code = ? AND status IN ('pending')`,
    [userId, code],
  );
  if (Number(waiting?.total ?? 0) > 0) {
    throw fail(409, "You have a payment with this coupon waiting to be checked.");
  }
  if (coupon.max_uses !== null && coupon.max_uses !== undefined) {
    const [all] = await query("SELECT COUNT(*) AS total FROM coupon_redemptions WHERE coupon_id = ?", [coupon.id]);
    if (Number(all?.total ?? 0) >= Number(coupon.max_uses)) throw fail(410, "This coupon has been used up.");
  }
  return rowToCoupon(coupon);
}

/**
 * What this member pays for a plan, with the festival offer and an
 * optional coupon: whichever is cheaper. couponCode is set only when the
 * coupon is what made the price.
 */
async function priceFor(plan, userId, rawCode) {
  const original = Number(plan.amount_paise);
  const festivalPrice = await billingService.chargeFor(plan);
  if (!rawCode) return { amountPaise: festivalPrice, originalPaise: original, couponCode: null, percent: null };
  if (plan.kind !== "subscription") throw fail(400, "Coupons are for the Premium plans.");
  const coupon = await usable(rawCode, userId);
  const couponPrice = billingService.offerPrice(original, coupon.percent);
  if (couponPrice < festivalPrice) {
    return { amountPaise: couponPrice, originalPaise: original, couponCode: coupon.code, percent: coupon.percent };
  }
  return { amountPaise: festivalPrice, originalPaise: original, couponCode: null, percent: coupon.percent };
}

/** The coupon shown at payment, if one is on and this member can use it. */
async function checkoutCoupon(userId) {
  const [row] = await query(`SELECT * FROM coupons WHERE show_at_checkout = 1 AND ${LIVE} LIMIT 1`);
  if (!row) return null;
  try {
    const coupon = await usable(row.code, userId);
    return { code: coupon.code, percent: coupon.percent, validUntil: coupon.validUntil };
  } catch {
    return null;
  }
}

/** The payment went through: the member has now used the coupon. */
async function redeem(payment) {
  const code = payment?.coupon_code;
  if (!code) return;
  const [coupon] = await query("SELECT id FROM coupons WHERE code = ?", [code]);
  if (!coupon) return;
  await query(
    "INSERT IGNORE INTO coupon_redemptions (coupon_id, user_id, payment_id) VALUES (?, ?, ?)",
    [coupon.id, payment.user_id, payment.id ?? null],
  );
}

module.exports = {
  MIN_PERCENT,
  MAX_PERCENT,
  normalizeCode,
  list,
  create,
  update,
  usable,
  priceFor,
  checkoutCoupon,
  redeem,
};
