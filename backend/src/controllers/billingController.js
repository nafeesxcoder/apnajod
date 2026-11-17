const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const billingService = require("../services/billingService");
const upiService = require("../services/upiService");
const couponService = require("../services/couponService");
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

/** Android: the purchase token from Google Play, checked with Google before anything is granted. */
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

/**
 * How a member can pay right now: the UPI ID (checked by hand, currently
 * hidden in the app), plus a coupon the admin shows at payment if this member
 * can still use it. Android buys through Google Play, which the app reads
 * on its own.
 */
const payOptions = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    upi: upiService.config(),
    payments: await upiService.mine(req.user.id),
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

// Google Play tells us about renewals, cancellations and expiries here.
// Google sends this, not a member, so it is checked with a shared secret.
const playNotify = asyncHandler(async (req, res) => {
  const expected = process.env.PLAY_NOTIFY_TOKEN || "";
  const given = String(req.query.token || "");
  const same =
    expected.length >= 20 &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!same) return res.status(403).json({ ok: false });
  try {
    await require("../services/playBillingService").playBilling.handleNotification(req.body || {});
    res.json({ ok: true });
  } catch (error) {
    // A message we cannot read will not get better on a retry: acknowledge it.
    // Anything else (Google unreachable) answers 500 so Google sends it again.
    if (error.status === 400) return res.json({ ok: false });
    throw new ApiError(500, error.message);
  }
});

const playStatus = asyncHandler(async (req, res) => {
  try {
    const status = await require("../services/playBillingService").playBilling.status(
      req.user.id,
      String(req.query.productId || ""),
    );
    res.json({ ok: true, ...status });
  } catch (error) {
    throw new ApiError(error.status || 500, error.message);
  }
});

module.exports = {
  plans, me, boost, checkCoupon, playVerify, playNotify, playStatus, payOptions, submitUpi,
};
