const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const billingService = require("../services/billingService");
const razorpayService = require("../services/razorpayService");
const upiService = require("../services/upiService");
const { query } = require("../config/db");
const { ApiError } = require("../middleware/errorHandler");

const plans = asyncHandler(async (_req, res) => {
  res.json({ ok: true, plans: await billingService.listPlans() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, billing: await billingService.summaryFor(req.user.id) });
});

const boost = asyncHandler(async (req, res) => {
  const started = await billingService.startBoost(req.user.id);
  res.json({
    ok: true,
    boost: started,
    billing: await billingService.summaryFor(req.user.id),
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const { planCode } = req.body || {};
  if (!planCode) throw new ApiError(400, "planCode is required");

  if (!razorpayService.isConfigured()) {
    throw new ApiError(503, "Payments are not available yet");
  }

  const [plan] = await query(
    "SELECT * FROM billing_plans WHERE code = ? AND active = 1",
    [planCode],
  );
  if (!plan) throw new ApiError(400, "Unknown plan");

  const order = await razorpayService.createOrder({
    amountPaise: plan.amount_paise,
    receipt: `aj_${Date.now()}_${req.user.id.slice(0, 8)}`,
    notes: { userId: req.user.id, planCode: plan.code },
  });

  const paymentId = crypto.randomUUID();
  await query(
    `INSERT INTO payments
       (id, user_id, plan_code, provider, provider_ref, status, amount_paise, created_at)
     VALUES (?, ?, ?, 'razorpay', ?, 'created', ?, NOW())`,
    [paymentId, req.user.id, plan.code, order.id, plan.amount_paise],
  );

  res.json({
    ok: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    planCode: plan.code,
    planTitle: plan.title,
  });
});

const webhook = asyncHandler(async (req, res) => {
  const signature = req.get("x-razorpay-signature");
  if (!signature) throw new ApiError(400, "No signature");

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
  if (!razorpayService.verifyWebhookSignature(rawBody, signature)) {
    throw new ApiError(400, "Invalid signature");
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  const eventType = event?.event;
  const paymentEntity = event?.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;

  if (!orderId) {
    return res.json({ ok: true, ignored: "no order" });
  }

  if (eventType === "payment.captured" || eventType === "order.paid") {
    const [paymentRow] = await query(
      "SELECT * FROM payments WHERE provider_ref = ? AND provider = 'razorpay'",
      [orderId],
    );
    if (!paymentRow) return res.json({ ok: true, ignored: "no payment row" });

    if (paymentRow.granted_at) {
      return res.json({ ok: true, already_granted: true });
    }

    const [plan] = await query(
      "SELECT * FROM billing_plans WHERE code = ?",
      [paymentRow.plan_code],
    );
    if (!plan) throw new ApiError(400, "Unknown plan on payment");

    const updateResult = await query(
      `UPDATE payments
          SET status = 'paid',
              granted_at = NOW(6),
              provider_payment_id = ?
        WHERE id = ? AND granted_at IS NULL`,
      [paymentEntity.id, paymentRow.id],
    );

    if (updateResult.affectedRows === 0) {
      return res.json({ ok: true, already_granted: true });
    }

    await billingService.grantPlan(paymentRow.user_id, plan, "razorpay");
    return res.json({ ok: true, granted: true });
  }

  if (eventType === "payment.failed") {
    await query(
      `UPDATE payments
          SET status = 'failed'
        WHERE provider_ref = ? AND granted_at IS NULL`,
      [orderId],
    );
    return res.json({ ok: true, failed: true });
  }

  res.json({ ok: true, ignored: eventType });
});

/**
 * How a member can pay right now: our UPI ID (checked by hand) and, once
 * the Razorpay account is live, Razorpay. Test keys never reach members.
 */
const payOptions = asyncHandler(async (req, res) => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "");
  res.json({
    ok: true,
    upi: upiService.config(),
    razorpay: razorpayService.isConfigured() && keyId.startsWith("rzp_live_"),
    payments: await upiService.mine(req.user.id),
  });
});

const submitUpi = asyncHandler(async (req, res) => {
  const { planCode, utr } = req.body || {};
  if (!planCode) throw new ApiError(400, "planCode is required");
  try {
    const payment = await upiService.submit(req.user.id, planCode, utr);
    res.json({ ok: true, payment });
  } catch (error) {
    if (error.status) throw new ApiError(error.status, error.message);
    throw error;
  }
});

module.exports = { plans, me, boost, createOrder, webhook, payOptions, submitUpi };
