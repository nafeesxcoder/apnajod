/**
 * UPI payments that members sent earlier, checked by hand by an admin.
 *
 * Members no longer pay this way: payment is only through Google Play in
 * the Android app. What is left lets an admin approve or reject the UPI
 * payments already sent, from the admin Payments tab.
 */
const { query } = require("../config/db");
const { decrypt } = require("./fieldCrypto");
const billingService = require("./billingService");
const couponService = require("./couponService");
const pushService = require("./pushService");

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function rowToPayment(row) {
  return {
    id: row.id,
    planCode: row.plan_code,
    planTitle: row.plan_title ?? row.plan_code,
    amountPaise: Number(row.amount_paise),
    utr: row.provider_ref,
    status: row.status === "paid" ? "approved" : row.status,
    note: row.status === "rejected" ? row.notes || null : null,
    couponCode: row.coupon_code ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Pending first (oldest first, the order they came in), then the last reviewed. */
async function listForAdmin() {
  const select = `SELECT pay.*, bp.title AS plan_title, u.username, u.phone, p.first_name, p.city
       FROM payments pay
       LEFT JOIN billing_plans bp ON bp.code = pay.plan_code
       LEFT JOIN users u ON u.id = pay.user_id
       LEFT JOIN profiles p ON p.user_id = pay.user_id
      WHERE pay.provider = 'upi'`;
  const pending = await query(
    `${select} AND pay.status = 'pending' ORDER BY pay.created_at ASC LIMIT 200`,
  );
  const reviewed = await query(
    `${select} AND pay.status IN ('paid','rejected') ORDER BY pay.updated_at DESC LIMIT 30`,
  );
  const withMember = (row) => ({
    ...rowToPayment(row),
    userId: row.user_id,
    username: row.username ?? null,
    phone: decrypt(row.phone),
    firstName: row.first_name ?? null,
    city: row.city ?? null,
  });
  return { pending: pending.map(withMember), reviewed: reviewed.map(withMember) };
}

async function pendingCount() {
  const [row] = await query(
    "SELECT COUNT(*) AS total FROM payments WHERE provider = 'upi' AND status = 'pending'",
  );
  return Number(row?.total ?? 0);
}

async function approve(paymentId) {
  const [row] = await query(
    "SELECT * FROM payments WHERE id = ? AND provider = 'upi'",
    [paymentId],
  );
  if (!row) throw fail(404, "Payment not found.");
  if (row.granted_at) return { alreadyApproved: true };
  const [plan] = await query("SELECT * FROM billing_plans WHERE code = ?", [row.plan_code]);
  if (!plan) throw fail(400, "Unknown plan on payment");

  // The guard on granted_at means two clicks grant the plan once.
  const result = await query(
    `UPDATE payments SET status = 'paid', granted_at = NOW(6), notes = NULL
      WHERE id = ? AND granted_at IS NULL AND status IN ('pending','rejected')`,
    [paymentId],
  );
  if ((result?.affectedRows ?? 0) === 0) return { alreadyApproved: true };
  await billingService.grantPlan(row.user_id, plan, "upi");
  await couponService.redeem(row);

  pushService
    .notifyUser(row.user_id, {
      title: `${plan.title} is on 🎉`,
      body: "We got your UPI payment. Thank you!",
      data: { type: "upi_approved" },
    })
    .catch(() => undefined);
  return { approved: true };
}

async function reject(paymentId, reason) {
  const note = String(reason || "").trim().slice(0, 200) || "We could not find this payment.";
  const [row] = await query(
    "SELECT * FROM payments WHERE id = ? AND provider = 'upi'",
    [paymentId],
  );
  if (!row) throw fail(404, "Payment not found.");
  if (row.granted_at) throw fail(409, "This payment is already approved.");
  await query(
    "UPDATE payments SET status = 'rejected', notes = ? WHERE id = ? AND granted_at IS NULL",
    [note, paymentId],
  );
  pushService
    .notifyUser(row.user_id, {
      title: "UPI payment not verified",
      body: note,
      data: { type: "upi_rejected" },
    })
    .catch(() => undefined);
  return { rejected: true };
}

module.exports = {
  listForAdmin,
  pendingCount,
  approve,
  reject,
};
