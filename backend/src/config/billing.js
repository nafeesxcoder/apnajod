/**
 * The numbers behind the paid features.
 *
 * Prices live in the billing_plans table, because changing one should not
 * need a deploy. These are the limits instead - how generous the free tier
 * is, how long a boost runs - and they are env-overridable so they can be
 * tuned on the server while we learn what converts.
 */
const number = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

module.exports = {
  /**
   * Likes a free member gets per day. Generous on purpose: a dating app
   * with nobody liking anybody is dead, and the limit only has to be low
   * enough that an active member notices it.
   */
  freeDailyLikes: () => number("FREE_DAILY_LIKES", 15),

  /** How long one boost puts a member at the top of other decks. */
  boostMinutes: () => number("BOOST_MINUTES", 30),

  /**
   * How many likers a free member sees in full. The rest arrive without a
   * name or a photo, as a count and a blurred row, which is the upsell.
   */
  freeVisibleLikers: () => number("FREE_VISIBLE_LIKERS", 1),

  /** India only, so the day that a like allowance resets on is the IST day. */
  indiaOffsetMinutes: 330,
};
