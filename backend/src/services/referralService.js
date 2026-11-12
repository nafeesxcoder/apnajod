const { query } = require("../config/db");
const billingService = require("./billingService");
const pushService = require("./pushService");

/**
 * Invite & earn.
 *
 * A member shares apnajoda.com/?invite=<their username>. The app keeps
 * that name until signup, and sends it with the new account. Once the new
 * member has a name, an age and a photo - a real profile, not an empty
 * account made to farm rewards - the inviter gets a free Boost and the new
 * member a free Super Like.
 *
 * Limits that keep it honest:
 *  - only brand-new accounts count (not a restored or re-registered one);
 *  - nobody can invite themselves;
 *  - each new member is counted once, ever (invitee_id is the key);
 *  - an inviter earns at most MONTHLY_CAP rewards in 30 days. Joins past
 *    that are still recorded, as 'capped', so the count stays truthful.
 */
const MONTHLY_CAP = 10;
const INVITER_REWARD = { kind: "boost", quantity: 1 };
const INVITEE_REWARD = { kind: "superlike", quantity: 1 };

function cleanUsername(value) {
  const name = String(value || "").trim().toLowerCase().replace(/^@/, "");
  return /^[a-z0-9._]{3,30}$/.test(name) ? name : null;
}

/**
 * Remember who invited a brand-new member. Never throws: a bad or unknown
 * invite must not stop anyone signing up.
 */
async function recordSignup(inviteeId, invite) {
  try {
    const username = cleanUsername(invite);
    if (!username) return false;
    const [inviter] = await query(
      `SELECT id FROM users
        WHERE username = ? AND deleted_at IS NULL AND status <> 'suspended'
        LIMIT 1`,
      [username],
    );
    if (!inviter || inviter.id === inviteeId) return false;
    const result = await query(
      "INSERT IGNORE INTO referrals (invitee_id, inviter_id) VALUES (?, ?)",
      [inviteeId, inviter.id],
    );
    return (result?.affectedRows ?? 0) === 1;
  } catch (error) {
    console.error("[referral] could not record signup:", error.message);
    return false;
  }
}

async function profileIsReal(userId) {
  const [row] = await query(
    `SELECT p.first_name, p.age,
            (SELECT COUNT(*) FROM profile_photos ph WHERE ph.user_id = p.user_id) AS photos
       FROM profiles p
      WHERE p.user_id = ?`,
    [userId],
  );
  return !!(row && String(row.first_name || "").trim() && row.age && Number(row.photos) > 0);
}

/**
 * Pay out an invite once the new member's profile is real. Safe to call
 * after every profile or photo save: it does nothing until the profile is
 * ready, and settles each invite exactly once. Never throws.
 */
async function rewardIfReady(inviteeId) {
  try {
    const [referral] = await query(
      "SELECT inviter_id FROM referrals WHERE invitee_id = ? AND settled_at IS NULL",
      [inviteeId],
    );
    if (!referral) return null;
    if (!(await profileIsReal(inviteeId))) return null;

    const inviterId = referral.inviter_id;
    const [recent] = await query(
      `SELECT COUNT(*) AS n FROM referrals
        WHERE inviter_id = ? AND outcome = 'rewarded'
          AND settled_at > NOW(6) - INTERVAL 30 DAY`,
      [inviterId],
    );
    const outcome = Number(recent?.n || 0) >= MONTHLY_CAP ? "capped" : "rewarded";

    // Claim it first, so two saves at once cannot pay twice.
    const claim = await query(
      `UPDATE referrals SET settled_at = NOW(6), outcome = ?
        WHERE invitee_id = ? AND settled_at IS NULL`,
      [outcome, inviteeId],
    );
    if ((claim?.affectedRows ?? 0) !== 1) return null;

    if (outcome === "rewarded") {
      await billingService.addCredits(inviterId, INVITER_REWARD.kind, INVITER_REWARD.quantity);
    }
    // The new member's welcome gift does not depend on the inviter's cap.
    await billingService.addCredits(inviteeId, INVITEE_REWARD.kind, INVITEE_REWARD.quantity);

    const [who] = await query("SELECT first_name FROM profiles WHERE user_id = ?", [inviteeId]);
    const name = String(who?.first_name || "").trim() || "Your friend";
    await pushService
      .notifyUser(inviterId, {
        title: outcome === "rewarded" ? "You earned a free Boost 🚀" : `${name} joined Apnajoda 🎉`,
        body:
          outcome === "rewarded"
            ? `${name} joined from your invite. Use your Boost to reach the top of the deck.`
            : `${name} joined from your invite. You've reached this month's Boost limit.`,
        data: { type: "referral" },
      })
      .catch(() => undefined);
    return outcome;
  } catch (error) {
    console.error("[referral] could not settle:", error.message);
    return null;
  }
}

/** What the member's own invites have done, for the Invite screen. */
async function summaryFor(userId) {
  const [row] = await query(
    `SELECT COUNT(*) AS joined,
            COALESCE(SUM(outcome = 'rewarded'), 0) AS rewarded,
            COALESCE(SUM(settled_at IS NULL), 0) AS pending
       FROM referrals WHERE inviter_id = ?`,
    [userId],
  );
  return {
    joined: Number(row?.joined || 0),
    boostsEarned: Number(row?.rewarded || 0) * INVITER_REWARD.quantity,
    pending: Number(row?.pending || 0),
    monthlyCap: MONTHLY_CAP,
  };
}

module.exports = {
  MONTHLY_CAP,
  cleanUsername,
  recordSignup,
  rewardIfReady,
  summaryFor,
};
