/**
 * Pass codes the admin writes (DIWALI-style codes, stored in `coupons`).
 *
 * Payment is only through Google Play, which takes no coupons, so a code
 * gives a free pass instead of money off: the admin picks the plan (Plus,
 * Pro or Everything), how many months, until when and how many members can
 * use it, and can switch it on and off. A member types the code in Premium
 * (app or website) and the pass starts at once.
 *
 * - A member can use a code once (coupon_redemptions, one row per member).
 * - Old percent-off coupons from before stay listed but no longer work.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const passService = require("./passService");
const { PASS_PLANS, PASS_MONTHS } = require("../config/passes");

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

function rowToCode(row) {
  const plan = row.pass_plan || null;
  return {
    id: row.id,
    code: row.code,
    passPlan: plan,
    passPlanLabel: plan ? PASS_PLANS[plan]?.label || plan : null,
    passMonths: row.pass_months === null || row.pass_months === undefined ? null : Number(row.pass_months),
    /** Only on old coupons from before pass codes; they no longer work. */
    percent: plan ? null : Number(row.percent),
    validUntil: isoUtc(row.valid_until),
    maxUses: row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses),
    active: !!Number(row.active),
    uses: Number(row.uses ?? 0),
  };
}

async function list() {
  const rows = await query(
    `SELECT c.*, (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id) AS uses
       FROM coupons c WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 200`,
  );
  return rows.map(rowToCode);
}

async function create(adminId, input) {
  const code = normalizeCode(input?.code);
  if (!code) throw fail(400, "A code is 3 to 20 letters or numbers, like DIWALIFREE");
  const plan = String(input?.plan || "");
  if (!Object.prototype.hasOwnProperty.call(PASS_PLANS, plan)) throw fail(400, "Choose Plus, Pro or Everything.");
  const months = Number(input?.months);
  if (!PASS_MONTHS.includes(months)) throw fail(400, "Choose 1 month, 3 months or 1 year.");
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
  const id = crypto.randomUUID();
  try {
    await query(
      `INSERT INTO coupons (id, code, percent, valid_until, max_uses, active, show_at_checkout, created_by, pass_plan, pass_months)
       VALUES (?, ?, 0, ?, ?, 1, 0, ?, ?, ?)`,
      [id, code, validUntil, maxUses, adminId ?? null, plan, months],
    );
  } catch (error) {
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      throw fail(409, `${code} already exists. Pick another code.`);
    }
    throw error;
  }
  return { id, code };
}

/** Switch a code on or off. */
async function update(id, input) {
  const [row] = await query("SELECT id FROM coupons WHERE id = ? AND deleted_at IS NULL", [id]);
  if (!row) throw fail(404, "No such code");
  if (input?.active !== undefined) {
    await query("UPDATE coupons SET active = ? WHERE id = ?", [input.active ? 1 : 0, id]);
  }
  return { updated: true };
}

/**
 * Delete a pass code: it stops working and leaves the list. Its name is freed
 * for a new code (the old row is renamed), and members who used it keep their pass.
 */
async function remove(id) {
  const [row] = await query("SELECT id, code FROM coupons WHERE id = ? AND deleted_at IS NULL", [id]);
  if (!row) throw fail(404, "No such code");
  await query("UPDATE coupons SET deleted_at = NOW(), active = 0, code = ? WHERE id = ?", [
    `${row.code}-DEL-${String(row.id).slice(0, 8)}`,
    id,
  ]);
  return { deleted: true };
}

/** The pass code if this member can use it now, else a clear reason. */
async function usable(rawCode, userId) {
  const code = normalizeCode(rawCode);
  if (!code) throw fail(400, "That code is not right.");
  const [row] = await query("SELECT * FROM coupons WHERE code = ? AND deleted_at IS NULL", [code]);
  if (!row || !Number(row.active)) throw fail(404, "That code is not right.");
  if (!row.pass_plan) throw fail(410, "This code no longer works.");
  if (row.valid_until && new Date(isoUtc(row.valid_until)) <= new Date()) throw fail(410, "This code has ended.");
  const [used] = await query(
    "SELECT COUNT(*) AS total FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?",
    [row.id, userId],
  );
  if (Number(used?.total ?? 0) > 0) throw fail(409, "You have already used this code.");
  if (row.max_uses !== null && row.max_uses !== undefined) {
    const [all] = await query("SELECT COUNT(*) AS total FROM coupon_redemptions WHERE coupon_id = ?", [row.id]);
    if (Number(all?.total ?? 0) >= Number(row.max_uses)) throw fail(410, "This code has been used up.");
  }
  return rowToCode(row);
}

/**
 * Is any pass code usable right now (on, not ended, not used up)? Premium
 * shows "Have a pass code?" only then, so members do not look for codes
 * that do not exist.
 */
async function anyOpen() {
  const [row] = await query(
    `SELECT COUNT(*) AS total FROM coupons c
      WHERE c.pass_plan IS NOT NULL AND c.active = 1 AND c.deleted_at IS NULL
        AND (c.valid_until IS NULL OR c.valid_until > UTC_TIMESTAMP())
        AND (c.max_uses IS NULL OR c.max_uses > (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id))`,
  );
  return Number(row?.total ?? 0) > 0;
}

/**
 * A member types a pass code: the pass starts now. The redemption row is
 * written first (its key allows one per member, so two taps cannot both
 * count); if the pass cannot be given, the row is taken back.
 */
async function redeemPass(userId, rawCode) {
  const code = await usable(rawCode, userId);
  const claim = await query(
    "INSERT IGNORE INTO coupon_redemptions (coupon_id, user_id, payment_id) VALUES (?, ?, NULL)",
    [code.id, userId],
  );
  if (!claim?.affectedRows) throw fail(409, "You have already used this code.");
  try {
    await passService.givePass(null, userId, code.passPlan, code.passMonths);
  } catch (error) {
    await query("DELETE FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?", [code.id, userId]);
    throw error;
  }
  return { code: code.code, pass: await passService.getPass(userId) };
}

module.exports = {
  normalizeCode,
  list,
  create,
  update,
  remove,
  usable,
  redeemPass,
  anyOpen,
};
