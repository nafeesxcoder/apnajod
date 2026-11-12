const { query } = require("../config/db");
const billingService = require("./billingService");
const pushService = require("./pushService");

/**
 * A free Super Like, once, for a 100% profile.
 *
 * "Complete" is checked here, on the server, from what is saved - the same
 * steps the app's Profile strength card counts (frontend
 * src/domain/profileStrength.ts), so the card reaching 100% and the reward
 * arriving happen together, and nobody can claim it by editing the app:
 *
 *   a photo · first name, age and gender · a bio of BIO_MIN+ characters ·
 *   HOBBIES_MIN+ hobbies · city and work · 3 of the 4 future questions ·
 *   an approved selfie.
 *
 * Checked after every profile, photo or intent save and when an admin
 * approves a selfie. Paid once ever (profile_rewards' key), so deleting the
 * bio and writing it again pays nothing.
 */
const REWARD = "complete_profile";
const GIFT = { kind: "superlike", quantity: 1 };
const BIO_MIN = 30;
const HOBBIES_MIN = 3;

function filled(value) {
  return String(value ?? "").trim().length > 0;
}

function hobbyCount(raw) {
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  return Array.isArray(list) ? list.filter(filled).length : 0;
}

/** Is this member's saved profile at 100%? Pure, so it can be tested. */
function isComplete({ profile, intent, photos }) {
  if (!profile) return false;
  const answers = intent
    ? [intent.timeline, intent.children, intent.family, intent.relocation].filter(filled).length
    : 0;
  return (
    Number(photos) > 0 &&
    filled(profile.first_name) &&
    filled(profile.age) &&
    filled(profile.gender) &&
    String(profile.about ?? "").trim().length >= BIO_MIN &&
    hobbyCount(profile.hobbies) >= HOBBIES_MIN &&
    filled(profile.city) &&
    filled(profile.profession) &&
    answers >= 3 &&
    (Number(profile.verified) === 1 || profile.verification_status === "approved")
  );
}

async function claimed(userId) {
  try {
    const [row] = await query(
      "SELECT 1 AS yes FROM profile_rewards WHERE user_id = ? AND reward = ?",
      [userId, REWARD],
    );
    return !!row;
  } catch {
    return false;
  }
}

/**
 * Pay the reward if the profile is now complete and it has not been paid.
 * Returns the gift when it was paid just now, otherwise null. Never throws -
 * a save must not fail over a reward.
 */
async function rewardIfComplete(userId) {
  try {
    const [[profile], [intent], [photos]] = await Promise.all([
      query(
        `SELECT first_name, age, gender, about, hobbies, city, profession, verified, verification_status
           FROM profiles WHERE user_id = ?`,
        [userId],
      ),
      query("SELECT timeline, children, family, relocation FROM profile_intent WHERE user_id = ?", [userId]),
      query("SELECT COUNT(*) AS n FROM profile_photos WHERE user_id = ?", [userId]),
    ]);
    if (!isComplete({ profile, intent, photos: photos?.n })) return null;

    const claim = await query(
      "INSERT IGNORE INTO profile_rewards (user_id, reward) VALUES (?, ?)",
      [userId, REWARD],
    );
    if ((claim?.affectedRows ?? 0) !== 1) return null;

    await billingService.addCredits(userId, GIFT.kind, GIFT.quantity);
    await pushService
      .notifyUser(userId, {
        title: "Profile complete! 🎉",
        body: "You earned a free Super Like. Use it on someone special.",
        data: { type: "profile_reward" },
      })
      .catch(() => undefined);
    return { ...GIFT };
  } catch (error) {
    console.error("[profile-reward] could not check:", error.message);
    return null;
  }
}

module.exports = { REWARD, GIFT, BIO_MIN, HOBBIES_MIN, isComplete, claimed, rewardIfComplete };
