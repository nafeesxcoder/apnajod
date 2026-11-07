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
   * Likes a free member gets per day. 0 means no limit.
   *
   * It defaults to no limit because there is no way to pay yet: a member
   * stopped on their fifteenth like today would be shown a price and no
   * till. Set FREE_DAILY_LIKES=15 on the day checkout goes live - the gate
   * itself is built and tested, it is only waiting for somewhere to pay.
   */
  freeDailyLikes: () => number("FREE_DAILY_LIKES", 0),

  /** How long one boost puts a member at the top of other decks. */
  boostMinutes: () => number("BOOST_MINUTES", 30),

  /**
   * How many likers a free member sees in full. 0 means all of them.
   *
   * Off for the same reason as the like limit: a locked row with no way to
   * unlock it is just a worse app. Set FREE_VISIBLE_LIKERS=1 when checkout
   * is live.
   */
  freeVisibleLikers: () => number("FREE_VISIBLE_LIKERS", 0),

  /** India only, so the day that a like allowance resets on is the IST day. */
  indiaOffsetMinutes: 330,
};
