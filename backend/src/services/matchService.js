const crypto = require("crypto");

const { query } = require("../config/db");
const { ApiError } = require("../middleware/errorHandler");
const pushService = require("./pushService");
const billingService = require("./billingService");
const limits = require("../config/billing");

/** Notifications (the bell and its list) cover the last 30 days. */
const NOTIFICATION_DAYS = 30;

async function recordDecision(actorId, targetId, decision, options = {}) {
  // Nothing is written against an id that is not a member. Without this the
  // id reached the foreign key, MySQL raised ER_NO_REFERENCED_ROW_2 and the
  // request came back a 500 - which the app shows as a crash rather than as
  // one unavailable profile. A deleted account lands here too.
  const [target] = await query(
    "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL",
    [targetId],
  );
  if (!target) {
    throw new ApiError(404, "That profile is no longer available");
  }

  // A free member gets so many likes a day. Passing is never limited: the
  // deck has to stay usable, and charging somebody to say no to a profile
  // would be a strange thing to sell.
  //
  // Liking the same person twice is one like, not two - the insert below
  // is ON DUPLICATE KEY, so it writes no new row - and the count only sees
  // rows, so a double tap never costs an extra like.
  // A Spark or Super Like pays for itself, so it skips the limit.
  if (decision === "interested" && !options.skipLikeLimit) {
    const [already] = await query(
      `SELECT decision FROM match_decisions WHERE actor_id = ? AND target_id = ?`,
      [actorId, targetId],
    );
    if (already?.decision !== "interested") {
      const allowance = await billingService.likeAllowance(actorId);
      if (allowance.remaining !== null && allowance.remaining <= 0) {
        throw new ApiError(
          402,
          `You have used today's ${allowance.limit} likes. Go Premium for unlimited, or come back tomorrow.`,
        );
      }
    }
  }

  await query(
    `INSERT INTO match_decisions (id, actor_id, target_id, decision)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE decision = VALUES(decision)`,
    [crypto.randomUUID(), actorId, targetId, decision],
  );

  let mutual = false;

  if (decision === "interested") {
    const [reciprocal] = await query(
      `SELECT id FROM match_decisions WHERE actor_id = ? AND target_id = ? AND decision = 'interested'`,
      [targetId, actorId],
    );
    if (reciprocal) {
      const [userA, userB] = [actorId, targetId].sort();
      await query(
        `INSERT IGNORE INTO mutual_matches (id, user_a_id, user_b_id) VALUES (?, ?, ?)`,
        [crypto.randomUUID(), userA, userB],
      );
      mutual = true;
      // The other person liked first and has been waiting; they are the one
      // who needs telling. Push is best-effort - it does nothing without
      // VAPID keys - and the match is in their Chats either way.
      const [actor] = await query(
        "SELECT first_name FROM profiles WHERE user_id = ?",
        [actorId],
      );
      pushService
        .notifyUser(targetId, {
          title: "It's a match",
          body: `${actor?.first_name || "Someone"} liked you back. You can message each other now.`,
          data: { type: "match", userId: actorId },
        })
        .catch(() => undefined);
    }
  }

  return { ok: true, mutual };
}

/**
 * The number on the Home bell.
 *
 * Every like aimed at this member since they last opened Notifications -
 * a plain like, a like-back that made a match, a Spark or a Super Like all
 * arrive as their 'interested' decision. Only the last 30 days count, and
 * blocked or deleted accounts never do.
 */
async function notificationCount(userId) {
  const [row] = await query(
    `SELECT COUNT(*) AS unread
       FROM match_decisions d
       JOIN users me ON me.id = d.target_id
       JOIN users u
         ON u.id = d.actor_id
        AND u.deleted_at IS NULL
        AND u.deactivated_at IS NULL
      WHERE d.target_id = ?
        AND d.decision = 'interested'
        AND d.actor_id <> ?
        AND d.updated_at >= NOW() - INTERVAL ${NOTIFICATION_DAYS} DAY
        AND (me.notifications_seen_at IS NULL OR d.updated_at > me.notifications_seen_at)
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
           WHERE (b.blocker_id = ? AND b.blocked_id = d.actor_id)
              OR (b.blocker_id = d.actor_id AND b.blocked_id = ?)
        )`,
    [userId, userId, userId, userId],
  );
  return Number(row?.unread || 0);
}

/** Opening Notifications clears the bell. */
async function markNotificationsSeen(userId) {
  await query("UPDATE users SET notifications_seen_at = NOW(6) WHERE id = ?", [userId]);
}

async function getMutualMatches(userId) {
  const rows = await query(
    `SELECT
       CASE WHEN mm.user_a_id = ? THEN mm.user_b_id ELSE mm.user_a_id END AS other_user_id,
       mm.created_at
     FROM mutual_matches mm
     WHERE mm.user_a_id = ? OR mm.user_b_id = ?
     ORDER BY mm.created_at DESC`,
    [userId, userId, userId],
  );

  const results = [];
  for (const row of rows) {
    const blocked = await query(
      `SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
      [userId, row.other_user_id, row.other_user_id, userId],
    );
    if (blocked.length) continue;
    const [profile] = await query(
      "SELECT first_name, age, city, profession, gender FROM profiles WHERE user_id = ?",
      [row.other_user_id],
    );
    const [account] = await query(
      "SELECT username FROM users WHERE id = ? AND deleted_at IS NULL",
      [row.other_user_id],
    );
    // A match with a deleted account is not a match any more.
    if (!account) continue;
    const photos = await query(
      "SELECT photo_url FROM profile_photos WHERE user_id = ? ORDER BY position ASC",
      [row.other_user_id],
    );
    results.push({
      id: row.other_user_id,
      profileId: row.other_user_id,
      matchId: row.other_user_id,
      username: account.username,
      name: profile?.first_name || "Member",
      age: profile?.age || 0,
      city: profile?.city || "",
      profession: profile?.profession || "",
      gender: profile?.gender || "nonbinary",
      photo: photos[0]?.photo_url || "",
      photos: photos.map((p) => p.photo_url),
      matchedAt: row.created_at,
    });
  }
  return results;
}

/**
 * Everyone who has liked me, newest first, each with where it stands.
 *
 * This list used to drop anybody already matched, so a like vanished at the
 * exact moment it was accepted and the member had no record that the thing
 * had happened at all. It now keeps them and says which they are:
 *
 *   pending   they liked you; it is yours to accept
 *   accepted  you liked back, and the chat is open
 *
 * Enough of each profile comes back to decide on — photos, age, city, work
 * and their own words — because deciding from a name and a grey circle is
 * not deciding.
 *
 * Blocks are filtered out (you shouldn't see someone you blocked, even if
 * they liked you before), and self is obviously excluded.
 *
 * Two queries, not 1 + 3N: the per-person lookups ran once per row, so a
 * hundred likes meant three hundred round trips to show one screen.
 */
async function getIncomingLikes(userId, limit = 100) {
  const rows = await query(
    `SELECT
       d.actor_id, d.created_at,
       u.username, u.avatar_url,
       p.first_name, p.age, p.city, p.profession, p.gender, p.about,
       p.verified, p.hobbies,
       ${billingService.blueTickSql("d.actor_id", "p.verified")} AS blue_tick,
       (SELECT s.kind FROM match_sparks s
         WHERE s.actor_id = d.actor_id AND s.target_id = d.target_id
         ORDER BY s.kind = 'superlike' DESC, s.created_at DESC LIMIT 1) AS spark_kind,
       (SELECT s.note FROM match_sparks s
         WHERE s.actor_id = d.actor_id AND s.target_id = d.target_id
         ORDER BY s.kind = 'superlike' DESC, s.created_at DESC LIMIT 1) AS spark_note,
       EXISTS (
         SELECT 1 FROM mutual_matches m
          WHERE (m.user_a_id = d.actor_id AND m.user_b_id = d.target_id)
             OR (m.user_a_id = d.target_id AND m.user_b_id = d.actor_id)
       ) AS accepted
     FROM match_decisions d
     JOIN users u
       ON u.id = d.actor_id
      AND u.deleted_at IS NULL
      AND u.deactivated_at IS NULL
     LEFT JOIN profiles p ON p.user_id = d.actor_id
     WHERE d.target_id = ?
       AND d.decision = 'interested'
       AND d.actor_id <> ?
       -- Notifications shows the last 30 days, like the bell.
       AND d.updated_at >= NOW() - INTERVAL ${NOTIFICATION_DAYS} DAY
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ? AND b.blocked_id = d.actor_id)
             OR (b.blocker_id = d.actor_id AND b.blocked_id = ?)
       )
     ORDER BY
       -- Super Likes, then Sparks, then plain likes. Standing out is what
       -- the sender spent something on.
       CASE spark_kind WHEN 'superlike' THEN 0 WHEN 'spark' THEN 1 ELSE 2 END,
       d.created_at DESC
     LIMIT ${Number(limit)}`,
    [userId, userId, userId, userId],
  );

  if (!rows.length) return [];

  const ids = rows.map((row) => row.actor_id);
  const photoRows = await query(
    `SELECT user_id, photo_url
       FROM profile_photos
      WHERE user_id IN (${ids.map(() => "?").join(",")})
      ORDER BY position ASC`,
    ids,
  );
  const photosByUser = new Map();
  for (const photo of photoRows) {
    const list = photosByUser.get(photo.user_id) ?? [];
    list.push(photo.photo_url);
    photosByUser.set(photo.user_id, list);
  }

  // Who this member may actually see.
  //
  // Everyone they have already matched with stays visible - they can open
  // that chat anyway, so hiding the row would only confuse. Of the people
  // still waiting, a free member sees the newest few in full and the rest
  // as locked rows: a real count and a real timestamp, no name and no
  // photo. That count is the whole upsell, so it has to be honest.
  const premium = await billingService.isPremium(userId);
  const freeVisible = limits.freeVisibleLikers();
  // 0 means the gate is off, so nothing is locked. See config/billing.
  const gated = !premium && freeVisible > 0;
  let shownPending = 0;

  return rows.map((row) => {
    const accepted = !!row.accepted;
    const spark = row.spark_kind
      ? { kind: row.spark_kind, note: row.spark_note || "" }
      : null;
    let locked = false;
    // Someone who spent a Spark or Super Like to reach this member is never
    // hidden behind the lock - that is the whole point of sending one.
    if (gated && !accepted && !spark) {
      if (shownPending < freeVisible) shownPending += 1;
      else locked = true;
    }
    if (locked) {
      return {
        id: row.actor_id,
        locked: true,
        likedAt: row.created_at,
        status: "pending",
      };
    }
    const photos = photosByUser.get(row.actor_id) ?? [];
    // mysql2 hands back a JSON column already parsed, so JSON.parse on it
    // throws and the hobbies silently became an empty list.
    let hobbies = [];
    if (Array.isArray(row.hobbies)) {
      hobbies = row.hobbies;
    } else if (typeof row.hobbies === "string" && row.hobbies.trim()) {
      try {
        hobbies = JSON.parse(row.hobbies);
      } catch {
        hobbies = [];
      }
    }
    return {
      id: row.actor_id,
      profileId: row.actor_id,
      userId: row.actor_id,
      username: row.username || "",
      name: row.first_name || row.username || "Member",
      age: row.age || 0,
      city: row.city || "",
      profession: row.profession || "",
      gender: row.gender || "nonbinary",
      about: row.about || "",
      verified: row.verified === 1,
      blueTick: Number(row.blue_tick) === 1,
      hobbies: Array.isArray(hobbies) ? hobbies : [],
      photo: photos[0] || row.avatar_url || "",
      photos,
      locked: false,
      likedAt: row.created_at,
      status: accepted ? "accepted" : "pending",
      spark,
    };
  });
}

async function searchProfiles(userId, filters = {}) {
  const {
    minAge = 21,
    maxAge = 45,
    city,
    gender,
    verified,
    minKundliScore,
    limit = 20
  } = filters;

  const [myPrefs] = await query(
    "SELECT * FROM matching_preferences WHERE user_id = ?",
    [userId]
  );

  const [me] = await query(
    "SELECT rashi, nakshatra, gender FROM profiles WHERE user_id = ?",
    [userId]
  );

  let genderFilter = "";
  if (gender && ["man", "woman"].includes(gender)) {
    genderFilter = "AND p.gender = ?";
  }

  let cityFilter = "";
  if (city) {
    cityFilter = "AND LOWER(p.city) LIKE LOWER(?)";
  }

  let verifiedFilter = "";
  if (verified === true) {
    verifiedFilter = "AND p.verified = 1";
  }

  const candidates = await query(
    `SELECT
       u.id AS user_id, u.username,
       p.first_name, p.gender, p.age, p.height, p.city, p.profession,
       p.religion, p.community, p.about, p.verified, p.hobbies,
       p.rashi, p.nakshatra, p.manglik,
       EXISTS (
         SELECT 1 FROM boosts b
          WHERE b.user_id = u.id AND b.ends_at > UTC_TIMESTAMP(6)
       ) AS boosted
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id != ?
       AND u.deleted_at IS NULL
       AND u.deactivated_at IS NULL
       AND (p.age IS NULL OR (p.age BETWEEN ? AND ?))
       AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
       AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       AND u.id NOT IN (SELECT target_id FROM match_decisions WHERE actor_id = ? AND decision = 'interested')
       ${genderFilter}
       ${cityFilter}
       ${verifiedFilter}
     ORDER BY
       boosted DESC,
       p.verified DESC,
       p.updated_at DESC
     LIMIT ?`,
    [userId, minAge, maxAge, userId, userId, userId, ...(gender ? [gender] : []), ...(city ? [`%${city}%`] : []), limit]
  );

  if (!candidates.length) return [];

  const kundliService = require("./kundliService");
  for (const candidate of candidates) {
    candidate.gun = kundliService.gunBadge(me, candidate);
  }

  if (minKundliScore) {
    const fits = candidates.filter(c => c.gun && c.gun.full && c.gun.score >= minKundliScore);
    candidates.splice(0, candidates.length, ...fits.slice(0, Number(limit)));
  }

  if (!candidates.length) return [];

  const candidateIds = candidates.map(c => c.user_id);
  const placeholders = candidateIds.map(() => "?").join(",");

  const allPhotos = await query(
    `SELECT user_id, photo_url FROM profile_photos
     WHERE user_id IN (${placeholders})
     ORDER BY user_id, position ASC`,
    candidateIds
  );
  const photosByUser = {};
  for (const row of allPhotos) {
    if (!photosByUser[row.user_id]) photosByUser[row.user_id] = [];
    photosByUser[row.user_id].push(row.photo_url);
  }

  const allVibes = await query(
    `SELECT user_id, vibe FROM profile_vibes WHERE user_id IN (${placeholders})`,
    candidateIds
  );
  const vibesByUser = {};
  for (const row of allVibes) {
    if (!vibesByUser[row.user_id]) vibesByUser[row.user_id] = [];
    vibesByUser[row.user_id].push(row.vibe);
  }

  return candidates.map(candidate => ({
    id: candidate.user_id,
    profileId: candidate.user_id,
    matchId: candidate.user_id,
    name: candidate.first_name || candidate.username || "Member",
    age: candidate.age || 0,
    city: candidate.city || "",
    profession: candidate.profession || "",
    gender: candidate.gender || "nonbinary",
    about: candidate.about || "",
    verified: candidate.verified === 1,
    photos: photosByUser[candidate.user_id] || [],
    vibes: vibesByUser[candidate.user_id] || [],
    kundli: candidate.gun ? { score: candidate.gun.score, full: candidate.gun.full } : null,
    rashi: candidate.rashi,
    nakshatra: candidate.nakshatra
  }));
}

async function getEnhancedNotifications(userId, type = "all") {
  const types = {
    all: "d.decision = 'interested'",
    likes: "d.decision = 'interested'",
    matches: "EXISTS (SELECT 1 FROM mutual_matches m WHERE (m.user_a_id = ? AND m.user_b_id = d.actor_id) OR (m.user_a_id = d.actor_id AND m.user_b_id = ?))"
  };

  const typeFilter = types[type] || types.all;
  const extraParams = type === "matches" ? [userId, userId] : [];

  const [row] = await query(
    `SELECT COUNT(*) AS count
       FROM match_decisions d
       JOIN users u ON u.id = d.actor_id AND u.deleted_at IS NULL
      WHERE d.target_id = ?
        AND ${typeFilter}
        AND d.updated_at >= NOW() - INTERVAL ${NOTIFICATION_DAYS} DAY
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
           WHERE (b.blocker_id = ? AND b.blocked_id = d.actor_id)
              OR (b.blocker_id = d.actor_id AND b.blocked_id = ?)
        )`,
    [userId, ...extraParams, userId, userId]
  );

  return Number(row?.count || 0);
}

async function getRecommendations(userId, limit = 10) {
  const [me] = await query(
    "SELECT rashi, nakshatra, gender FROM profiles WHERE user_id = ?",
    [userId]
  );

  const [myPrefs] = await query(
    "SELECT * FROM matching_preferences WHERE user_id = ?",
    [userId]
  );

  const lookingFor = myPrefs?.looking_for || "everyone";
  const wantGender = lookingFor === "women" ? "woman" : lookingFor === "men" ? "man" : null;
  const minAge = myPrefs?.min_age ?? 21;
  const maxAge = myPrefs?.max_age ?? 45;

  const candidates = await query(
    `SELECT
       u.id AS user_id, u.username,
       p.first_name, p.gender, p.age, p.city, p.profession, p.about,
       p.verified, p.rashi, p.nakshatra, p.manglik,
       EXISTS (
         SELECT 1 FROM boosts b
          WHERE b.user_id = u.id AND b.ends_at > UTC_TIMESTAMP(6)
       ) AS boosted,
       (SELECT COUNT(*) FROM profile_intent pi WHERE pi.user_id = u.id LIMIT 1) AS has_intent
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id != ?
       AND u.deleted_at IS NULL
       AND u.deactivated_at IS NULL
       AND (p.age IS NULL OR (p.age BETWEEN ? AND ?))
       ${wantGender ? "AND (p.gender = ? OR p.gender IS NULL)" : ""}
       AND p.verified = 1
       AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
       AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       AND u.id NOT IN (SELECT target_id FROM match_decisions WHERE actor_id = ? AND decision = 'interested')
     ORDER BY
       boosted DESC,
       has_intent DESC,
       p.verified DESC,
       p.updated_at DESC
     LIMIT ?`,
    [userId, minAge, maxAge, ...(wantGender ? [wantGender] : []), userId, userId, userId, limit]
  );

  const kundliService = require("./kundliService");
  for (const candidate of candidates) {
    candidate.gun = kundliService.gunBadge(me, candidate);
  }

  if (!candidates.length) return [];

  const candidateIds = candidates.map(c => c.user_id);
  const placeholders = candidateIds.map(() => "?").join(",");

  const allPhotos = await query(
    `SELECT user_id, photo_url FROM profile_photos
     WHERE user_id IN (${placeholders})
     ORDER BY user_id, position ASC`,
    candidateIds
  );
  const photosByUser = {};
  for (const row of allPhotos) {
    if (!photosByUser[row.user_id]) photosByUser[row.user_id] = [];
    photosByUser[row.user_id].push(row.photo_url);
  }

  const allIntents = await query(
    `SELECT user_id, intent FROM profile_intent
     WHERE user_id IN (${placeholders})`,
    candidateIds
  );
  const intentByUser = {};
  for (const row of allIntents) {
    intentByUser[row.user_id] = row.intent;
  }

  return candidates.map(candidate => ({
    id: candidate.user_id,
    profileId: candidate.user_id,
    name: candidate.first_name || candidate.username || "Member",
    age: candidate.age || 0,
    city: candidate.city || "",
    profession: candidate.profession || "",
    gender: candidate.gender || "nonbinary",
    about: candidate.about || "",
    verified: candidate.verified === 1,
    photos: photosByUser[candidate.user_id] || [],
    kundli: candidate.gun ? { score: candidate.gun.score, full: candidate.gun.full } : null,
    intent: intentByUser[candidate.user_id] || null,
    boosted: candidate.boosted === 1
  }));
}

module.exports = {
  recordDecision,
  getMutualMatches,
  getIncomingLikes,
  notificationCount,
  markNotificationsSeen,
  searchProfiles,
  getEnhancedNotifications,
  getRecommendations,
};
