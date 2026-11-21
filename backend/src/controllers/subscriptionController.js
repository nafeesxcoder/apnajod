const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../config/db");

/**
 * Get subscription plans
 */
const getPlans = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, name, price, duration_days, features, is_active FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC`
  );
  res.json({ ok: true, plans: rows });
});

/**
 * Get user's current subscription
 */
const getUserSubscription = asyncHandler(async (req, res) => {
  const [sub] = await query(
    `SELECT id, plan_id, started_at, expires_at, status FROM user_subscriptions
     WHERE user_id = ? AND status = 'active' ORDER BY expires_at DESC LIMIT 1`,
    [req.user.id]
  );
  res.json({ ok: true, subscription: sub || null });
});

/**
 * Create subscription (after payment verified)
 */
const createSubscription = asyncHandler(async (req, res) => {
  const { planId, paymentToken, verificationToken } = req.body;

  if (!planId || !paymentToken) {
    return res.status(400).json({ error: "Missing plan or payment info" });
  }

  // Get plan details
  const [plan] = await query(
    `SELECT id, name, price, duration_days FROM subscription_plans WHERE id = ? AND is_active = 1`,
    [planId]
  );

  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  // Create subscription record
  const expiresAt = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO user_subscriptions (user_id, plan_id, started_at, expires_at, status, payment_token)
     VALUES (?, ?, NOW(), ?, 'active', ?)`,
    [req.user.id, planId, expiresAt, paymentToken]
  );

  // Update user premium status
  await query(
    `UPDATE users SET is_premium = 1, premium_until = ? WHERE id = ?`,
    [expiresAt, req.user.id]
  );

  res.json({ ok: true, message: "Subscription created", expiresAt });
});

/**
 * Cancel subscription
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  await query(
    `UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'`,
    [req.user.id]
  );

  await query(
    `UPDATE users SET is_premium = 0 WHERE id = ?`,
    [req.user.id]
  );

  res.json({ ok: true, message: "Subscription cancelled" });
});

/**
 * Check if user has active subscription
 */
const checkPremium = asyncHandler(async (req, res) => {
  const [user] = await query(
    `SELECT is_premium, premium_until FROM users WHERE id = ?`,
    [req.user.id]
  );

  const isPremium = user && user.is_premium && new Date(user.premium_until) > new Date();

  res.json({ ok: true, isPremium, expiresAt: user?.premium_until || null });
});

module.exports = {
  getPlans,
  getUserSubscription,
  createSubscription,
  cancelSubscription,
  checkPremium,
};
