/**
 * UPI payments checked by hand, while the payment gateway waits on KYC.
 *
 * The member pays our UPI ID from any UPI app and sends the 12 digit UTR
 * (the "UPI Ref No." every app shows). The payment waits as pending until
 * an admin sees the money in the bank app and approves it. Approving grants
 * the plan exactly as a Razorpay payment would.
 *
 * Nothing expires on its own: the admin may not be at the dashboard for a
 * while, so a payment can be approved whenever they get to it - even one
 * rejected by mistake earlier.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const billingService = require("./billingService");
const couponService = require("./couponService");
const pushService = require("./pushService");

/** How long we tell members it can take. */
const APPROVAL_HOURS = 24;
/** Open requests one member can have at once (stops a flood of fake UTRs). */
const MAX_PENDING = 3;

function config() {
  return {
    enabled: String(process.env.UPI_PAYMENTS || "on").toLowerCase() !== "off",
    upiId: String(process.env.UPI_ID || "nafeesahmadno1@ybl").trim(),
    payeeName: String(process.env.UPI_NAME || "Nafees Ahmad").trim(),
    approvalHours: APPROVAL_HOURS,
  };
}

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** A UPI UTR / reference number is 12 digits. Spaces and dashes are dropped. */
function normalizeUtr(raw) {
  const digits = String(raw ?? "").replace(/[\s-]/g, "");
  return /^\d{12}$/.test(digits) ? digits : null;
}

function isDuplicate(error) {
  return error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
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

async function adminIds() {
  const rows = await query(
    "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL",
  );
  return rows.map((row) => row.id);
}

async function memberName(userId) {
  const [row] = await query(
    `SELECT u.username, p.first_name FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
    [userId],
  );
  return row?.first_name || (row?.username ? `@${row.username}` : "A member");
}

/** The member's own UPI payments from the last 30 days, newest first. */
async function mine(userId) {
  const rows = await query(
    `SELECT pay.*, bp.title AS plan_title FROM payments pay
       LEFT JOIN billing_plans bp ON bp.code = pay.plan_code
      WHERE pay.user_id = ? AND pay.provider = 'upi'
        AND pay.created_at >= NOW() - INTERVAL 30 DAY
      ORDER BY pay.created_at DESC LIMIT 5`,
    [userId],
  );
  return rows.map(rowToPayment);
}

async function submit(userId, planCode, rawUtr, couponCode) {
  if (!config().enabled) throw fail(503, "UPI payments are closed right now.");
  const utr = normalizeUtr(rawUtr);
  if (!utr) {
    throw fail(400, "Enter the 12 digit UTR / UPI Ref No. from your payment app.");
  }
  const [plan] = await query(
    "SELECT * FROM billing_plans WHERE code = ? AND active = 1",
    [planCode],
  );
  if (!plan) throw fail(400, "Unknown plan");

  const [open] = await query(
    `SELECT COUNT(*) AS total FROM payments
      WHERE user_id = ? AND provider = 'upi' AND status = 'pending'`,
    [userId],
  );
  if (Number(open?.total ?? 0) >= MAX_PENDING) {
    throw fail(429, "You already have payments waiting to be checked. We will get to them soon.");
  }

  // The festival offer or the coupon, whichever is cheaper, comes off.
  const price = await couponService.priceFor(plan, userId, couponCode);
  const amountPaise = price.amountPaise;
  const id = crypto.randomUUID();
  try {
    await query(
      `INSERT INTO payments
         (id, user_id, plan_code, provider, provider_ref, status, amount_paise, coupon_code, created_at)
       VALUES (?, ?, ?, 'upi', ?, 'pending', ?, ?, NOW(6))`,
      [id, userId, plan.code, utr, amountPaise, price.couponCode],
    );
  } catch (error) {
    if (isDuplicate(error)) throw fail(409, "This UTR has already been sent.");
    throw error;
  }

  // Tell every admin, so a payment does not sit unseen.
  const name = await memberName(userId);
  const rupees = Math.round(amountPaise / 100);
  for (const adminId of await adminIds()) {
    pushService
      .notifyUser(adminId, {
        title: `₹${rupees} UPI payment to check`,
        body: `${name} · ${plan.title}${price.couponCode ? ` · ${price.couponCode}` : ""} · UTR ${utr}`,
        data: { type: "upi_payment" },
      })
      .catch(() => undefined);
  }

  const [row] = await query(
    `SELECT pay.*, bp.title AS plan_title FROM payments pay
       LEFT JOIN billing_plans bp ON bp.code = pay.plan_code WHERE pay.id = ?`,
    [id],
  );
  return rowToPayment(row);
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
    phone: row.phone ?? null,
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
  APPROVAL_HOURS,
  MAX_PENDING,
  config,
  normalizeUtr,
  mine,
  submit,
  listForAdmin,
  pendingCount,
  approve,
  reject,
};
