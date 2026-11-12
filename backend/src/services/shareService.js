const crypto = require("crypto");
const { query } = require("../config/db");
const { ApiError } = require("../middleware/errorHandler");
const env = require("../config/env");
const followService = require("./followService");

/**
 * "Show my family" - a link to a profile that family can open without an
 * account.
 *
 * Who may share whom:
 *   - your own profile, any time (your "biodata" for your family)
 *   - someone else's, only once you are a mutual match - by then both of
 *     you have shown interest, which is when family usually gets involved,
 *     and nobody's photos travel outside the app on one person's whim.
 *
 * What the link shows is deliberately limited: first name, age, city, work,
 * up to three photos, about, and intent answers. No username, no religion
 * or community, nothing to find or contact them by. It expires in 7 days,
 * and stops working at once if either account is closed or one blocks the
 * other.
 */
const VALID_DAYS = 7;
const MAX_PER_DAY = 20;

async function isMutualMatch(a, b) {
  const [userA, userB] = [a, b].sort();
  const [row] = await query(
    "SELECT 1 FROM mutual_matches WHERE user_a_id = ? AND user_b_id = ? LIMIT 1",
    [userA, userB],
  );
  return !!row;
}

async function isBlockedEitherWay(a, b) {
  const [row] = await query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1`,
    [a, b, b, a],
  );
  return !!row;
}

async function isLive(userId) {
  const [row] = await query(
    "SELECT 1 FROM users WHERE id = ? AND deleted_at IS NULL AND deactivated_at IS NULL",
    [userId],
  );
  return !!row;
}

/** Make a link. Returns the token, a URL, and when it stops working. */
async function create(sharerId, targetId) {
  const target = targetId || sharerId;
  if (!(await isLive(target))) throw new ApiError(404, "That profile is no longer available");

  if (target !== sharerId) {
    if (await isBlockedEitherWay(sharerId, target)) {
      throw new ApiError(404, "That profile is no longer available");
    }
    if (!(await isMutualMatch(sharerId, target))) {
      throw new ApiError(
        403,
        "You can share someone's profile with family once you are a match.",
      );
    }
  }

  const [today] = await query(
    `SELECT COUNT(*) AS made FROM profile_shares
      WHERE sharer_id = ? AND created_at > UTC_TIMESTAMP(6) - INTERVAL 1 DAY`,
    [sharerId],
  );
  if (Number(today?.made) >= MAX_PER_DAY) {
    throw new ApiError(429, "You have shared a lot today. Try again tomorrow.");
  }

  const token = crypto.randomBytes(16).toString("hex");
  await query(
    `INSERT INTO profile_shares (token, sharer_id, target_id, expires_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP(6) + INTERVAL ${VALID_DAYS} DAY)`,
    [token, sharerId, target],
  );
  const [row] = await query("SELECT expires_at FROM profile_shares WHERE token = ?", [token]);
  const base = String(env.appUrl || "").replace(/\/+$/, "");
  return {
    token,
    url: `${base}/?share=${token}`,
    expiresAt: row?.expires_at ? new Date(`${String(row.expires_at).replace(" ", "T")}Z`).toISOString() : null,
    own: target === sharerId,
  };
}

/** What a family member sees when they open the link. No login. */
async function view(token) {
  if (!/^[a-f0-9]{32}$/.test(String(token || ""))) {
    throw new ApiError(404, "This link is not valid.");
  }
  const [share] = await query(
    `SELECT sharer_id, target_id, expires_at,
            expires_at > UTC_TIMESTAMP(6) AS live
       FROM profile_shares WHERE token = ?`,
    [token],
  );
  if (!share) throw new ApiError(404, "This link is not valid.");
  if (!Number(share.live)) throw new ApiError(410, "This link has expired. Ask for a new one.");

  const { sharer_id: sharerId, target_id: targetId } = share;
  if (!(await isLive(targetId)) || !(await isLive(sharerId))) {
    throw new ApiError(410, "This profile is no longer available.");
  }
  if (sharerId !== targetId) {
    // A block or an unmatch after the link was made ends it.
    if ((await isBlockedEitherWay(sharerId, targetId)) || !(await isMutualMatch(sharerId, targetId))) {
      throw new ApiError(410, "This profile is no longer available.");
    }
  }

  const card = await followService.getProfileCard(targetId);
  const [sharer] = await query("SELECT first_name FROM profiles WHERE user_id = ?", [sharerId]);
  await query("UPDATE profile_shares SET views = views + 1 WHERE token = ?", [token]);

  return {
    sharedBy: sharer?.first_name || "A member",
    own: sharerId === targetId,
    expiresAt: share.expires_at ? new Date(`${String(share.expires_at).replace(" ", "T")}Z`).toISOString() : null,
    profile: {
      firstName: card.firstName || "Member",
      age: card.age || 0,
      city: card.city || "",
      profession: card.profession || "",
      about: card.about || "",
      verified: !!card.verified,
      photos: (card.photos || []).slice(0, 3),
      intent: card.intent || null,
    },
  };
}

module.exports = { VALID_DAYS, MAX_PER_DAY, create, view };
