const { query } = require("../config/db");

/**
 * Activity on your posts - who liked them and who commented - and the push
 * notifications for it, like Instagram's.
 *
 * Never about yourself (your own like or comment), never from someone either
 * of you blocked, never from a deleted or deactivated account.
 */

const LIKE_PUSH_GAP_MS = 60 * 60 * 1000;

function push(userId, payload) {
  // Loaded late: pushService reads env and the web-push library.
  return require("./pushService")
    .notifyUser(userId, payload)
    .catch(() => undefined);
}

async function actorName(userId) {
  const [row] = await query("SELECT username FROM users WHERE id = ? LIMIT 1", [userId]);
  return row?.username ? `@${row.username}` : "Someone";
}

async function blockedBetween(a, b) {
  const rows = await query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1`,
    [a, b, b, a],
  );
  return rows.length > 0;
}

/** "@rahul liked your post" - at most once an hour per post. */
async function notifyLike(actorId, postId, ownerId) {
  if (!ownerId || actorId === ownerId) return { sent: false, reason: "self" };
  if (await blockedBetween(actorId, ownerId)) return { sent: false, reason: "blocked" };
  // Claim the slot in one statement, so two likes at the same moment send one push.
  const claim = await query(
    `UPDATE posts SET like_push_at = NOW(6)
      WHERE id = ? AND (like_push_at IS NULL OR like_push_at < NOW(6) - INTERVAL ? SECOND)`,
    [postId, Math.round(LIKE_PUSH_GAP_MS / 1000)],
  );
  if (!claim.affectedRows) return { sent: false, reason: "recent" };
  const [{ n } = { n: 0 }] = await query("SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?", [postId]);
  const others = Math.max(0, Number(n) - 1);
  const who = await actorName(actorId);
  await push(ownerId, {
    title: "Apnajoda",
    body: others > 0 ? `${who} and ${others} ${others === 1 ? "other" : "others"} liked your post` : `${who} liked your post`,
    postId,
  });
  return { sent: true };
}

/** "@rahul commented: Bahut sundar!" - every comment. */
async function notifyComment(actorId, postId, ownerId, body) {
  if (!ownerId || actorId === ownerId) return { sent: false, reason: "self" };
  if (await blockedBetween(actorId, ownerId)) return { sent: false, reason: "blocked" };
  const who = await actorName(actorId);
  const text = String(body || "").replace(/\s+/g, " ").trim();
  await push(ownerId, {
    title: "Apnajoda",
    body: `${who} commented: ${text.length > 80 ? `${text.slice(0, 79)}…` : text}`,
    postId,
  });
  return { sent: true };
}

const ACTOR = `
  u.id AS actor_id, u.username AS actor_username,
  COALESCE(NULLIF(pr.first_name, ''), u.full_name, u.username) AS actor_name,
  COALESCE(
    (SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = u.id ORDER BY ph.position ASC LIMIT 1),
    u.avatar_url
  ) AS actor_avatar`;
const VISIBLE_ACTOR = `
  u.id <> ? AND u.deleted_at IS NULL AND u.deactivated_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM blocks b
                   WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                      OR (b.blocker_id = u.id AND b.blocked_id = ?))`;

/** Likes and comments on your posts, newest first, and how many are new. */
async function activity(userId, limit = 60) {
  const size = Math.min(100, Math.max(1, Number(limit) || 60));
  const rows = await query(
    `SELECT * FROM (
       SELECT 'like' AS kind, l.created_at AS at, NULL AS body, p.id AS post_id, p.media_url, ${ACTOR}
         FROM post_likes l
         JOIN posts p ON p.id = l.post_id AND p.user_id = ?
         JOIN users u ON u.id = l.user_id
         LEFT JOIN profiles pr ON pr.user_id = u.id
        WHERE ${VISIBLE_ACTOR}
       UNION ALL
       SELECT 'comment' AS kind, c.created_at AS at, c.body, p.id AS post_id, p.media_url, ${ACTOR}
         FROM post_comments c
         JOIN posts p ON p.id = c.post_id AND p.user_id = ?
         JOIN users u ON u.id = c.user_id
         LEFT JOIN profiles pr ON pr.user_id = u.id
        WHERE ${VISIBLE_ACTOR}
     ) a
     ORDER BY a.at DESC
     LIMIT ${size}`,
    [userId, userId, userId, userId, userId, userId, userId, userId],
  );
  const [seen] = await query("SELECT activity_seen_at FROM users WHERE id = ?", [userId]);
  const seenAt = seen?.activity_seen_at ? new Date(seen.activity_seen_at).getTime() : 0;
  const items = rows.map((row) => ({
    kind: row.kind,
    at: row.at,
    body: row.body || null,
    post: { id: row.post_id, mediaUrl: row.media_url },
    actor: {
      userId: row.actor_id,
      username: row.actor_username,
      name: row.actor_name || row.actor_username,
      avatarUrl: row.actor_avatar || null,
    },
    isNew: new Date(row.at).getTime() > seenAt,
  }));
  return { items, unread: items.filter((item) => item.isNew).length };
}

/** How many likes and comments arrived since you last opened Activity. */
async function unreadCount(userId) {
  const [row] = await query(
    `SELECT
       (SELECT COUNT(*) FROM post_likes l
          JOIN posts p ON p.id = l.post_id AND p.user_id = ?
          JOIN users u ON u.id = l.user_id
         WHERE ${VISIBLE_ACTOR}
           AND l.created_at > COALESCE((SELECT activity_seen_at FROM users WHERE id = ?), '1970-01-01'))
     + (SELECT COUNT(*) FROM post_comments c
          JOIN posts p ON p.id = c.post_id AND p.user_id = ?
          JOIN users u ON u.id = c.user_id
         WHERE ${VISIBLE_ACTOR}
           AND c.created_at > COALESCE((SELECT activity_seen_at FROM users WHERE id = ?), '1970-01-01'))
       AS n`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId],
  );
  return Number(row?.n || 0);
}

async function markSeen(userId) {
  await query("UPDATE users SET activity_seen_at = NOW(6) WHERE id = ?", [userId]);
  return { unread: 0 };
}

module.exports = { LIKE_PUSH_GAP_MS, notifyLike, notifyComment, activity, unreadCount, markSeen };
