/**
 * What a member has paid for, and what that lets them do.
 *
 * Two rails will sell the same things - Razorpay on the website, Google
 * Play Billing in the Android app, because Play does not allow anything
 * else to charge for digital goods inside an app. Both end at grantPlan()
 * below, so no gate anywhere else in the app has to know which one paid.
 *
 * Every check here runs on the server. The client is told what it may do
 * so it can draw the right screen, but it is never asked.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const { ApiError } = require("../middleware/errorHandler");
const limits = require("../config/billing");

const PREMIUM = "premium";
/**
 * Pro is everything Premium (Plus) gives, plus the blue tick. It is its
 * own entitlement so the tick can follow Pro alone while every premium
 * gate keeps working for both plans.
 */
const PRO = "pro";
const BOOST = "boost";
const SUPERLIKE = "superlike";

/**
 * Midnight in India, as a UTC instant.
 *
 * The allowance has to reset at midnight where the members are. The server
 * runs on UTC, so comparing against UTC midnight would reset everyone's
 * likes at 5:30 in the morning IST - in the middle of the night for some,
 * and never when they would expect it.
 */
function startOfIndianDay(now = new Date()) {
  const offsetMs = limits.indiaOffsetMinutes * 60 * 1000;
  const indian = new Date(now.getTime() + offsetMs);
  const midnightIndian = Date.UTC(
    indian.getUTCFullYear(),
    indian.getUTCMonth(),
    indian.getUTCDate(),
  );
  return new Date(midnightIndian - offsetMs);
}

/** Today's date in India as YYYY-MM-DD - the day a free Spark or a daily question belongs to. */
function indianDay(now = new Date()) {
  const indian = new Date(now.getTime() + limits.indiaOffsetMinutes * 60 * 1000);
  return indian.toISOString().slice(0, 10);
}

/** MySQL DATETIME(6) in UTC, which is what every column here stores. */
function sqlTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** A price with a percent off, in whole rupees (never below ₹1). */
function offerPrice(amountPaise, percent) {
  const amount = Number(amountPaise);
  if (!percent) return amount;
  return Math.max(100, Math.round((amount * (100 - percent)) / 10000) * 100);
}

/** The festival offer on now ({ percent, themeKey, endsAt }), or null. */
async function currentOffer() {
  try {
    // Lazy: the festival service pulls in the socket layer.
    return await require("./festivalService").offer();
  } catch {
    return null;
  }
}

/** What a plan costs right now: the festival offer comes off. */
async function chargeFor(plan) {
  const offer = await currentOffer();
  return offerPrice(plan.amount_paise, offer?.percent ?? 0);
}

async function listPlans() {
  const plans = await query(
    `SELECT code, title, blurb, kind, grants, quantity, amount_paise,
            currency, play_product_id
       FROM billing_plans
      WHERE active = 1
      ORDER BY sort_order ASC, amount_paise ASC`,
  );
  const offer = await currentOffer();
  if (!offer) return plans;
  // During a festival offer every plan shows its old price struck through.
  return plans.map((plan) => ({
    ...plan,
    original_paise: Number(plan.amount_paise),
    amount_paise: offerPrice(plan.amount_paise, offer.percent),
    offer_percent: offer.percent,
    offer_ends_at: offer.endsAt,
  }));
}

async function getPlan(code) {
  const [plan] = await query(
    "SELECT * FROM billing_plans WHERE code = ? AND active = 1",
    [code],
  );
  return plan || null;
}

/** Is this member premium right now? Plus and Pro both count. */
async function isPremium(userId) {
  const [row] = await query(
    `SELECT 1 FROM entitlements
      WHERE user_id = ? AND feature IN (?, ?)
        AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(6))
      LIMIT 1`,
    [userId, PREMIUM, PRO],
  );
  return !!row;
}

/** Is this member on Pro right now? */
async function isPro(userId) {
  const [row] = await query(
    `SELECT 1 FROM entitlements
      WHERE user_id = ? AND feature = ?
        AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(6))
      LIMIT 1`,
    [userId, PRO],
  );
  return !!row;
}

/**
 * The blue tick: an approved selfie AND Pro running. Plus does not carry it.
 *
 * Paying alone never shows it. A blue tick reads as "this person is real",
 * so anyone who could buy it without a verified selfie could buy trust -
 * which on a dating app is how scams start. An unverified member can still
 * pay for Pro; the tick turns on by itself the day the selfie is approved,
 * and goes away by itself when the plan lapses or the approval is undone.
 *
 * Returned as SQL so every list that already reads profiles can carry the
 * flag in the same query instead of one extra lookup per row.
 * `userIdExpr` and `verifiedExpr` are column names, never user input.
 */
function blueTickSql(userIdExpr, verifiedExpr) {
  return `(COALESCE(${verifiedExpr}, 0) = 1 AND EXISTS (
    SELECT 1 FROM entitlements bt
     WHERE bt.user_id = ${userIdExpr}
       AND bt.feature = '${PRO}'
       AND (bt.expires_at IS NULL OR bt.expires_at > UTC_TIMESTAMP(6))
  ))`;
}

async function trustStatus(userId) {
  const [row] = await query(
    `SELECT COALESCE(p.verified, 0) AS verified,
            ${blueTickSql("u.id", "p.verified")} AS blue_tick
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ?`,
    [userId],
  );
  return {
    verified: Number(row?.verified) === 1,
    blueTick: Number(row?.blue_tick) === 1,
  };
}

async function premiumUntil(userId) {
  // Whichever paid plan runs longest. A NULL expiry never runs out, so it
  // sorts first.
  const [row] = await query(
    `SELECT expires_at FROM entitlements
      WHERE user_id = ? AND feature IN (?, ?)
        AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(6))
      ORDER BY expires_at IS NULL DESC, expires_at DESC
      LIMIT 1`,
    [userId, PREMIUM, PRO],
  );
  if (!row) return null;
  return row.expires_at ? new Date(row.expires_at).toISOString() : null;
}

/**
 * Add days of a feature.
 *
 * Buying again while still subscribed extends from the existing expiry, not
 * from today, so nobody loses time they already paid for by renewing early.
 */
async function grantFeature(userId, feature, days, source) {
  await query(
    `INSERT INTO entitlements (user_id, feature, expires_at, source)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? DAY), ?)
     ON DUPLICATE KEY UPDATE
       expires_at = DATE_ADD(
         GREATEST(COALESCE(expires_at, UTC_TIMESTAMP(6)), UTC_TIMESTAMP(6)),
         INTERVAL ? DAY
       ),
       source = VALUES(source)`,
    [userId, feature, days, source, days],
  );
}

async function addCredits(userId, kind, quantity) {
  await query(
    `INSERT INTO credit_balances (user_id, kind, balance)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
    [userId, kind, quantity],
  );
}

async function creditBalance(userId, kind) {
  const [row] = await query(
    "SELECT balance FROM credit_balances WHERE user_id = ? AND kind = ?",
    [userId, kind],
  );
  return row ? Number(row.balance) : 0;
}

/**
 * Apply what a plan gives. Called by both payment rails and by a manual
 * grant from support.
 */
async function grantPlan(userId, plan, source) {
  if (plan.kind === "subscription") {
    await grantFeature(userId, plan.grants, Number(plan.quantity), source);
  } else {
    await addCredits(userId, plan.grants, Number(plan.quantity));
  }
}

/**
 * Spend one credit, refusing if there is none.
 *
 * The UPDATE carries its own `balance > 0`, so two requests arriving
 * together cannot both pass a check and leave the balance at -1. The table
 * has a CHECK constraint behind that as well.
 */
async function spendCredit(userId, kind) {
  const result = await query(
    `UPDATE credit_balances SET balance = balance - 1
      WHERE user_id = ? AND kind = ? AND balance > 0`,
    [userId, kind],
  );
  return (result?.affectedRows ?? 0) > 0;
}

/** Likes used since midnight IST. */
async function likesUsedToday(userId, now = new Date()) {
  const [row] = await query(
    `SELECT COUNT(*) AS used FROM match_decisions
      WHERE actor_id = ? AND decision = 'interested' AND created_at >= ?`,
    [userId, sqlTime(startOfIndianDay(now))],
  );
  return Number(row?.used ?? 0);
}

/**
 * What the deck should let this member do right now.
 * `remaining` is null when there is no limit.
 */
async function likeAllowance(userId, now = new Date()) {
  if (await isPremium(userId)) {
    return { premium: true, limit: null, used: 0, remaining: null };
  }
  const limit = limits.freeDailyLikes();
  // 0 means the gate is off - there is no way to pay yet, so a free member
  // is not stopped at a price they cannot settle.
  if (!limit) return { premium: false, limit: null, used: 0, remaining: null };
  const used = await likesUsedToday(userId, now);
  return {
    premium: false,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

/** Monday of this week in India, as YYYY-MM-DD. */
function indianWeekStart(now = new Date()) {
  const day = indianDay(now);
  const date = new Date(`${day}T00:00:00Z`);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - sinceMonday);
  return date.toISOString().slice(0, 10);
}

function isDuplicate(error) {
  return error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
}

/**
 * Hand out this week's Boosts and Super Likes, once, to a Plus or Pro member.
 *
 * Called whenever those credits are about to be read or spent, so there is
 * no weekly job to schedule or forget - the first time a member shows up in
 * a new week, their allowance lands. The row is written first and the
 * credits added only if that write succeeded, so a week can never pay out
 * twice. A member who upgrades from Plus to Pro mid-week gets the
 * difference, not a second full allowance.
 *
 * Credits carry over: anything not used this week is still there next week.
 */
async function ensureWeeklyAllowance(userId, now = new Date()) {
  const pro = await isPro(userId);
  const plan = pro ? PRO : (await isPremium(userId)) ? PREMIUM : null;
  if (!plan) return { granted: false };

  const weekStart = indianWeekStart(now);
  const amounts = limits.weeklyAllowance[plan];
  let give = amounts;
  try {
    await query(
      "INSERT INTO weekly_allowance_grants (user_id, week_start, plan) VALUES (?, ?, ?)",
      [userId, weekStart, plan],
    );
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    if (plan !== PRO) return { granted: false };
    // Already paid this week. Only a Plus week becoming Pro is owed more.
    const result = await query(
      `UPDATE weekly_allowance_grants SET plan = ?
        WHERE user_id = ? AND week_start = ? AND plan = ?`,
      [PRO, userId, weekStart, PREMIUM],
    );
    if ((result?.affectedRows ?? 0) === 0) return { granted: false };
    const plus = limits.weeklyAllowance[PREMIUM];
    give = {
      boost: Math.max(0, amounts.boost - plus.boost),
      superlike: Math.max(0, amounts.superlike - plus.superlike),
    };
  }
  if (give.boost > 0) await addCredits(userId, BOOST, give.boost);
  if (give.superlike > 0) await addCredits(userId, SUPERLIKE, give.superlike);
  return { granted: true, plan, weekStart, ...give };
}

/** Start a boost, spending one credit. */
async function startBoost(userId) {
  await ensureWeeklyAllowance(userId);
  const [live] = await query(
    "SELECT ends_at FROM boosts WHERE user_id = ? AND ends_at > UTC_TIMESTAMP(6) LIMIT 1",
    [userId],
  );
  if (live) {
    throw new ApiError(409, "A boost is already running");
  }
  if (!(await spendCredit(userId, BOOST))) {
    throw new ApiError(402, "No boosts left");
  }
  const minutes = limits.boostMinutes();
  await query(
    `INSERT INTO boosts (id, user_id, ends_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? MINUTE))`,
    [crypto.randomUUID(), userId, minutes],
  );
  return activeBoost(userId);
}

async function activeBoost(userId) {
  const [row] = await query(
    `SELECT ends_at FROM boosts
      WHERE user_id = ? AND ends_at > UTC_TIMESTAMP(6)
      ORDER BY ends_at DESC LIMIT 1`,
    [userId],
  );
  return row ? { endsAt: new Date(row.ends_at).toISOString() } : null;
}

/**
 * Everything the app needs to draw its paid states, in one call, so no
 * screen has to assemble this for itself and get it subtly different.
 */
async function summaryFor(userId) {
  // This week's Boosts and Super Likes land before the balances are read.
  await ensureWeeklyAllowance(userId);
  const [allowance, boosts, boost, trust, pro, superlikes] = await Promise.all([
    likeAllowance(userId),
    creditBalance(userId, BOOST),
    activeBoost(userId),
    trustStatus(userId),
    isPro(userId),
    creditBalance(userId, SUPERLIKE),
  ]);
  return {
    premium: allowance.premium,
    pro,
    verified: trust.verified,
    blueTick: trust.blueTick,
    premiumUntil: allowance.premium ? await premiumUntil(userId) : null,
    likes: {
      limit: allowance.limit,
      used: allowance.used,
      remaining: allowance.remaining,
    },
    boost: { balance: boosts, active: boost },
    superlikes,
    freeVisibleLikers: limits.freeVisibleLikers(),
  };
}

module.exports = {
  offerPrice,
  chargeFor,
  indianDay,
  PREMIUM,
  PRO,
  BOOST,
  SUPERLIKE,
  indianWeekStart,
  ensureWeeklyAllowance,
  startOfIndianDay,
  listPlans,
  getPlan,
  isPremium,
  isPro,
  blueTickSql,
  trustStatus,
  premiumUntil,
  grantFeature,
  grantPlan,
  addCredits,
  creditBalance,
  spendCredit,
  likesUsedToday,
  likeAllowance,
  startBoost,
  activeBoost,
  summaryFor,
};
