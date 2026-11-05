const crypto = require("crypto");
const { query } = require("../config/db");

async function recordDecision(actorId, targetId, decision) {
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
 * Who liked me but hasn't been matched with me yet?
 *
 * This is the "Likes" tab: incoming interest that is still one-sided. Once a
 * mutual match exists, the person moves out of this list and into the
 * Matches tab, so we exclude anyone who is already in mutual_matches.
 *
 * Blocks are filtered out (you shouldn't see someone you blocked, even if
 * they liked you before), and self is obviously excluded.
 */
async function getIncomingLikes(userId, limit = 100) {
  const rows = await query(
    `SELECT d.actor_id, d.created_at
       FROM match_decisions d
      WHERE d.target_id = ?
        AND d.decision = 'interested'
        AND d.actor_id <> ?
        AND NOT EXISTS (
          SELECT 1 FROM mutual_matches m
           WHERE (m.user_a_id = d.actor_id AND m.user_b_id = d.target_id)
              OR (m.user_a_id = d.target_id AND m.user_b_id = d.actor_id)
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
           WHERE (b.blocker_id = ? AND b.blocked_id = d.actor_id)
              OR (b.blocker_id = d.actor_id AND b.blocked_id = ?)
        )
      ORDER BY d.created_at DESC
      LIMIT ${Number(limit)}`,
    [userId, userId, userId, userId],
  );

  const results = [];
  for (const row of rows) {
    const [profile] = await query(
      "SELECT first_name, age, city, profession, gender FROM profiles WHERE user_id = ?",
      [row.actor_id],
    );
    const photos = await query(
      "SELECT photo_url FROM profile_photos WHERE user_id = ? ORDER BY position ASC",
      [row.actor_id],
    );
    const [user] = await query(
      "SELECT username, avatar_url FROM users WHERE id = ? AND deleted_at IS NULL",
      [row.actor_id],
    );
    // Skip accounts that have been deleted since they liked you.
    if (!user) continue;

    results.push({
      id: row.actor_id,
      profileId: row.actor_id,
      userId: row.actor_id,
      username: user.username || "",
      name: profile?.first_name || user.username || "Member",
      age: profile?.age || 0,
      city: profile?.city || "",
      profession: profile?.profession || "",
      gender: profile?.gender || "nonbinary",
      photo: photos[0]?.photo_url || user.avatar_url || "",
      photos: photos.map((p) => p.photo_url),
      likedAt: row.created_at,
    });
  }
  return results;
}

module.exports = {
  recordDecision,
  getMutualMatches,
  getIncomingLikes,
};
