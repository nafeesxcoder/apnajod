const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const billingService = require("../services/billingService");
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

/** A member types a pass code from the admin: the free pass starts now. */
const redeemCode = asyncHandler(async (req, res) => {
  try {
    const result = await require("../services/couponService").redeemPass(req.user.id, (req.body || {}).code);
    res.json({ ok: true, ...result, billing: await billingService.summaryFor(req.user.id) });
  } catch (error) {
    throw error && error.status ? new ApiError(error.status, error.message) : error;
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
  plans, me, boost, redeemCode, playVerify, playNotify, playStatus,
};
