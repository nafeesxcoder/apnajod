const asyncHandler = require("../utils/asyncHandler");
const billingService = require("../services/billingService");

/**
 * What is for sale. Public, so the pricing can be shown before signing up.
 * Paise is what the client is given; it formats the rupees itself rather
 * than two places doing their own rounding.
 */
const plans = asyncHandler(async (_req, res) => {
  res.json({ ok: true, plans: await billingService.listPlans() });
});

/**
 * Everything the app needs to draw its paid states in one call: premium or
 * not, likes left today, boosts held, a boost running.
 *
 * This is for drawing the screen. It is never what a gate trusts - each
 * gate asks the server again when it acts.
 */
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

module.exports = { plans, me, boost };
