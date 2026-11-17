/**
 * The plans and boost packs the admin can change.
 *
 * - The admin can change a plan's title, blurb, price, whether it is on sale,
 *   and the Google Play product id it is sold under.
 * - What a plan gives (Premium days, boost count) and whether it is a
 *   subscription stay fixed here; changing those means a deploy, because the
 *   app's screens describe them.
 * - A new price applies to purchases made after the change. Purchases already
 *   made keep the price they were made at.
 * - The price on Google Play is set in the Play Console, not here. Changing it
 *   here does not change what the Play store charges.
 */
const { query } = require("../config/db");

const PAISE_MIN = 100; // Rs 1
const PAISE_MAX = 1000000; // Rs 10,000
const PLAY_ID = /^[a-z0-9_.]{1,40}$/;

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function rowToPlan(row) {
  return {
    code: row.code,
    title: row.title,
    blurb: row.blurb || "",
    kind: row.kind,
    grants: row.grants,
    quantity: Number(row.quantity),
    amountPaise: Number(row.amount_paise),
    currency: row.currency,
    playProductId: row.play_product_id || null,
    active: !!Number(row.active),
  };
}

async function list() {
  const rows = await query(
    `SELECT code, title, blurb, kind, grants, quantity, amount_paise,
            currency, play_product_id, active
       FROM billing_plans
      ORDER BY sort_order ASC, amount_paise ASC`,
  );
  return rows.map(rowToPlan);
}

/**
 * Validate what the admin sent and return only the fields that changed.
 * Throws a 400 with a message the admin can read.
 */
function validate(input) {
  const changes = {};
  if (input?.title !== undefined) {
    const title = String(input.title).trim();
    if (title.length < 1 || title.length > 80) throw fail(400, "The title is 1 to 80 characters");
    changes.title = title;
  }
  if (input?.blurb !== undefined) {
    const blurb = String(input.blurb ?? "").trim();
    if (blurb.length > 160) throw fail(400, "The description is at most 160 characters");
    changes.blurb = blurb || null;
  }
  if (input?.amountPaise !== undefined) {
    const amount = Number(input.amountPaise);
    if (!Number.isInteger(amount) || amount < PAISE_MIN || amount > PAISE_MAX) {
      throw fail(400, "The price is between Rs 1 and Rs 10,000");
    }
    changes.amount_paise = amount;
  }
  if (input?.active !== undefined) {
    changes.active = input.active ? 1 : 0;
  }
  if (input?.playProductId !== undefined) {
    const id = String(input.playProductId ?? "").trim();
    if (id === "") {
      changes.play_product_id = null;
    } else {
      if (!PLAY_ID.test(id)) {
        throw fail(400, "The Play product id uses only small letters, numbers, _ and . (up to 40)");
      }
      changes.play_product_id = id;
    }
  }
  return changes;
}

async function update(code, input) {
  const [row] = await query("SELECT code FROM billing_plans WHERE code = ?", [code]);
  if (!row) throw fail(404, "No such plan");
  const changes = validate(input);
  if (changes.play_product_id) {
    const [taken] = await query(
      "SELECT code FROM billing_plans WHERE play_product_id = ? AND code <> ?",
      [changes.play_product_id, code],
    );
    if (taken) throw fail(409, `Play product id ${changes.play_product_id} is already used by ${taken.code}`);
  }
  const keys = Object.keys(changes);
  if (keys.length === 0) return { updated: false };
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  await query(
    `UPDATE billing_plans SET ${assignments} WHERE code = ?`,
    [...keys.map((key) => changes[key]), code],
  );
  return { updated: true };
}

module.exports = { list, update, validate, rowToPlan };
