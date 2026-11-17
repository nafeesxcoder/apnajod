const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const billingService = require("../services/billingService");
const razorpayService = require("../services/razorpayService");
const upiService = require("../services/upiService");
const couponService = require("../services/couponService");
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

/** Turn a coupon service error into the API's error. */
function couponError(error) {
  return error && error.status ? new ApiError(error.status, error.message) : error;
}

/** "Have a coupon?": what the plan costs with it, or why not. */
const checkCoupon = asyncHandler(async (req, res) => {
  const { planCode, code } = req.body || {};
  if (!planCode) throw new ApiError(400, "planCode is required");
  const plan = await billingService.getPlan(planCode);
  if (!plan) throw new ApiError(400, "Unknown plan");
  try {
    const price = await couponService.priceFor(plan, req.user.id, code);
    res.json({ ok: true, ...price });
  } catch (error) {
    throw couponError(error);
  }
});

/**
 * Whether this member may pay with Razorpay right now. Live keys: everyone.
 * Test keys (rzp_test_): only admins, so the owner can try checkout before
 * the account is approved while no member can unlock Premium with a test card.
 */
async function checkoutOpenFor(userId) {
  const mode = razorpayService.keyMode();
  if (mode === "live") return true;
  if (mode !== "test") return false;
  const [user] = await query("SELECT role FROM users WHERE id = ?", [userId]);
  return !!user && user.role === "admin";
}

/**
 * Turns on what a paid Razorpay order bought. The webhook and the app's own
 * check after checkout both land here, and `granted_at IS NULL` lets only
 * the first of them grant, so a payment never gives Premium twice.
 */
async function grantOrder(orderId, providerPaymentId) {
  const [paymentRow] = await query(
    "SELECT * FROM payments WHERE provider_ref = ? AND provider = 'razorpay'",
    [orderId],
  );
  if (!paymentRow) return { result: "missing" };
  if (paymentRow.granted_at) return { result: "already", paymentRow };

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
    [providerPaymentId, paymentRow.id],
  );
  if (updateResult.affectedRows === 0) return { result: "already", paymentRow };

  await billingService.grantPlan(paymentRow.user_id, plan, "razorpay");
  await couponService.redeem(paymentRow);
  return { result: "granted", paymentRow };
}

const createOrder = asyncHandler(async (req, res) => {
  const { planCode, couponCode } = req.body || {};
  if (!planCode) throw new ApiError(400, "planCode is required");

  if (!(await checkoutOpenFor(req.user.id))) {
    throw new ApiError(503, "Payments are not available yet");
  }

  const [plan] = await query(
    "SELECT * FROM billing_plans WHERE code = ? AND active = 1",
    [planCode],
  );
  if (!plan) throw new ApiError(400, "Unknown plan");

  // The festival offer or the coupon, whichever is cheaper, comes off here too.
  let price;
  try {
    price = await couponService.priceFor(plan, req.user.id, couponCode);
  } catch (error) {
    throw couponError(error);
  }
  const amountPaise = price.amountPaise;
  const order = await razorpayService.createOrder({
    amountPaise,
    receipt: `aj_${Date.now()}_${req.user.id.slice(0, 8)}`,
    notes: { userId: req.user.id, planCode: plan.code },
  });

  const paymentId = crypto.randomUUID();
  await query(
    `INSERT INTO payments
       (id, user_id, plan_code, provider, provider_ref, status, amount_paise, coupon_code, created_at)
     VALUES (?, ?, ?, 'razorpay', ?, 'created', ?, ?, NOW())`,
    [paymentId, req.user.id, plan.code, order.id, amountPaise, price.couponCode],
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
    const { result } = await grantOrder(orderId, paymentEntity.id);
    if (result === "missing") return res.json({ ok: true, ignored: "no payment row" });
    if (result === "already") return res.json({ ok: true, already_granted: true });
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
 * Right after checkout the app sends Razorpay's signed receipt here, so
 * Premium turns on at once instead of waiting for the webhook (which still
 * arrives and changes nothing, as the payment is already granted).
 */
// Android: the purchase token from Google Play, checked with Google before
// anything is granted.
const playVerify = asyncHandler(async (req, res) => {
  try {
    const result = await require("../services/playBillingService").playBilling.verifyPurchase(
      req.user.id,
      req.body || {},
    );
    res.json({ ok: true, ...result });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message);
  }
});

const verify = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body || {};
  if (!orderId || !paymentId || !signature) {
    throw new ApiError(400, "orderId, paymentId and signature are required");
  }
  if (!razorpayService.verifyPaymentSignature(orderId, paymentId, signature)) {
    throw new ApiError(400, "This payment could not be verified");
  }
  const [owner] = await query(
    "SELECT user_id FROM payments WHERE provider_ref = ? AND provider = 'razorpay'",
    [orderId],
  );
  if (!owner || owner.user_id !== req.user.id) {
    throw new ApiError(404, "Payment not found");
  }
  const { result } = await grantOrder(orderId, paymentId);
  res.json({
    ok: true,
    granted: result === "granted" || result === "already",
    billing: await billingService.summaryFor(req.user.id),
  });
});

/**
 * How a member can pay right now: our UPI ID (checked by hand) and, once
 * the Razorpay account is live, Razorpay. Test keys never reach members:
 * with rzp_test_ keys only admins see Razorpay, to try checkout.
 */
const payOptions = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    upi: upiService.config(),
    razorpay: await checkoutOpenFor(req.user.id),
    payments: await upiService.mine(req.user.id),
    // A coupon the admin shows at payment, if this member can still use it.
    coupon: await couponService.checkoutCoupon(req.user.id),
  });
});

const submitUpi = asyncHandler(async (req, res) => {
  const { planCode, utr, couponCode } = req.body || {};
  if (!planCode) throw new ApiError(400, "planCode is required");
  try {
    const payment = await upiService.submit(req.user.id, planCode, utr, couponCode);
    res.json({ ok: true, payment });
  } catch (error) {
    if (error.status) throw new ApiError(error.status, error.message);
    throw error;
  }
});

module.exports = { plans, me, boost, createOrder, webhook, verify, playVerify, payOptions, submitUpi, checkCoupon };
