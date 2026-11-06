/**
 * Follows and account privacy.
 *
 * Messaging is NOT decided here by follow state. Apnajoda is a dating app: the
 * only thing that unlocks a conversation is a mutual match (see
 * canMessage() below, which checks the mutual_matches table). Follows still
 * power requests, followers/following lists, and the "follow" affordance on
 * profiles — they just no longer grant message rights.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const { normalizeIndianPhone } = require("../utils/otp");

const SELF_FOLLOW = "You cannot follow your own account.";

async function getUser(userId) {
  const [row] = await query(
    "SELECT id, username, full_name, avatar_url, is_private FROM users WHERE id = ? AND deleted_at IS NULL",
    [userId],
  );
  return row || null;
}

async function isBlockedEitherWay(a, b) {
  const rows = await query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?)
         OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1`,
    [a, b, b, a],
  );
  return rows.length > 0;
}

async function edge(followerId, followingId) {
  const [row] = await query(
    "SELECT * FROM follows WHERE follower_id = ? AND following_id = ?",
    [followerId, followingId],
  );
  return row || null;
}

/** What the viewer sees on someone else's profile. */
async function followState(viewerId, otherId) {
  if (viewerId === otherId) return { self: true };
  const [outgoing, incoming] = await Promise.all([
    edge(viewerId, otherId),
    edge(otherId, viewerId),
  ]);
  return {
    self: false,
    following: outgoing?.status === "accepted",
    requested: outgoing?.status === "pending",
    followsYou: incoming?.status === "accepted",
    requestsYou: incoming?.status === "pending",
  };
}

async function setPrivacy(userId, isPrivate) {
  await query("UPDATE users SET is_private = ? WHERE id = ?", [
    isPrivate ? 1 : 0,
    userId,
  ]);
  // Going public clears the queue: nobody should stay waiting on an account
  // that no longer asks to be asked.
  if (!isPrivate) {
    await query(
      "UPDATE follows SET status = 'accepted', responded_at = NOW(6) WHERE following_id = ? AND status = 'pending'",
      [userId],
    );
  }
}

/**
 * Follow someone. A public account is followed immediately; a private one
 * records a request. Calling it twice is not an error, so a double tap on a
 * slow connection does not produce a confusing failure.
 */
async function follow(followerId, followingId) {
  if (followerId === followingId) {
    const err = new Error(SELF_FOLLOW);
    err.status = 400;
    throw err;
  }
  const target = await getUser(followingId);
  if (!target) {
    const err = new Error("That account is not available.");
    err.status = 404;
    throw err;
  }
  if (await isBlockedEitherWay(followerId, followingId)) {
    const err = new Error("That account is not available.");
    err.status = 404;
    throw err;
  }

  const existing = await edge(followerId, followingId);
  if (existing) return { status: existing.status, alreadyExisted: true };

  const status = target.is_private ? "pending" : "accepted";
  await query(
    `INSERT INTO follows (id, follower_id, following_id, status, responded_at)
     VALUES (?, ?, ?, ?, ${status === "accepted" ? "NOW(6)" : "NULL"})`,
    [crypto.randomUUID(), followerId, followingId, status],
  );
  return { status, alreadyExisted: false };
}

async function unfollow(followerId, followingId) {
  await query(
    "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
    [followerId, followingId],
  );
}

/** The owner of a private account answers a pending request. */
async function respond(ownerId, followerId, accept) {
  const existing = await edge(followerId, ownerId);
  if (!existing || existing.status !== "pending") {
    const err = new Error("There is no pending request from that account.");
    err.status = 404;
    throw err;
  }
  if (accept) {
    await query(
      "UPDATE follows SET status = 'accepted', responded_at = NOW(6) WHERE id = ?",
      [existing.id],
    );
    return { status: "accepted" };
  }
  await query("DELETE FROM follows WHERE id = ?", [existing.id]);
  return { status: "declined" };
}

async function listRequests(ownerId) {
  return query(
    `SELECT f.id, f.created_at, u.id AS user_id, u.username, u.full_name, u.avatar_url
       FROM follows f
       JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ? AND f.status = 'pending' AND u.deleted_at IS NULL
      ORDER BY f.created_at DESC
      LIMIT 100`,
    [ownerId],
  );
}

async function listFollowers(userId) {
  return query(
    `SELECT u.id AS user_id, u.username, u.full_name, u.avatar_url, u.is_private
       FROM follows f
       JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ? AND f.status = 'accepted' AND u.deleted_at IS NULL
      ORDER BY f.responded_at DESC
      LIMIT 500`,
    [userId],
  );
}

async function listFollowing(userId) {
  return query(
    `SELECT u.id AS user_id, u.username, u.full_name, u.avatar_url, u.is_private
       FROM follows f
       JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = ? AND f.status = 'accepted' AND u.deleted_at IS NULL
      ORDER BY f.responded_at DESC
      LIMIT 500`,
    [userId],
  );
}

async function counts(userId) {
  const [[followers], [following]] = await Promise.all([
    query(
      "SELECT COUNT(*) AS n FROM follows WHERE following_id = ? AND status = 'accepted'",
      [userId],
    ),
    query(
      "SELECT COUNT(*) AS n FROM follows WHERE follower_id = ? AND status = 'accepted'",
      [userId],
    ),
  ]);
  return { followers: followers?.n ?? 0, following: following?.n ?? 0 };
}

/**
 * May `viewerId` send a message to `otherId`?
 *
 * Blocks win over everything. After that, the ONLY thing that unlocks
 * messaging is a mutual match. Follows (public or private) no longer grant
 * message rights — that was the old follow-and-chat model and it let any
 * stranger message any woman who had not yet matched with him.
 */
async function canMessage(viewerId, otherId) {
  if (viewerId === otherId) return { allowed: false, reason: "self" };
  const other = await getUser(otherId);
  if (!other) return { allowed: false, reason: "not_found" };
  if (await isBlockedEitherWay(viewerId, otherId)) {
    return { allowed: false, reason: "blocked" };
  }

  const rows = await query(
    `SELECT 1 FROM mutual_matches
      WHERE (user_a_id = ? AND user_b_id = ?)
         OR (user_a_id = ? AND user_b_id = ?)
      LIMIT 1`,
    [viewerId, otherId, otherId, viewerId],
  );
  return rows.length
    ? { allowed: true, reason: "mutual_match" }
    : { allowed: false, reason: "no_match" };
}

/**
 * Username search. Exact matches first, then prefix, then anywhere.
 *
 * Every account is findable, private ones included. Hiding private accounts
 * here, with sign-up making every account private, meant the search returned
 * nothing at all - on a dating app, where finding somebody is the whole point.
 * Privacy is enforced where it belongs instead: messaging needs a mutual
 * like, so being found costs nothing.
 */
async function searchByUsername(viewerId, term, limit = 20) {
  const q = String(term || "")
    .trim()
    .toLowerCase();
  if (q.length < 2) return [];
  const rows = await query(
    `SELECT u.id AS user_id, u.username, u.full_name, u.avatar_url, u.is_private
       FROM users u
      WHERE u.deleted_at IS NULL
        AND u.deactivated_at IS NULL
        AND u.username IS NOT NULL
        AND u.id != ?
        AND LOWER(u.username) LIKE ?
        AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
        AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
      ORDER BY
        CASE WHEN LOWER(u.username) = ? THEN 0
             WHEN LOWER(u.username) LIKE ? THEN 1
             ELSE 2 END,
        u.username ASC
      LIMIT ${Number(limit)}`,
    [viewerId, `%${q}%`, viewerId, viewerId, q, `${q}%`],
  );
  return decorate(viewerId, rows);
}

/**
 * Match a contact list against accounts. Numbers are hashed against the same
 * normalisation sign-up uses, and nothing is stored: the list is used for this
 * request and discarded.
 */
async function matchContacts(viewerId, phones, limit = 200) {
  const normalized = [
    ...new Set(
      (Array.isArray(phones) ? phones : [])
        .map((value) => normalizeIndianPhone(String(value || "")))
        .filter(Boolean),
    ),
  ].slice(0, 1000);
  if (!normalized.length) return [];

  const placeholders = normalized.map(() => "?").join(",");
  const rows = await query(
    `SELECT u.id AS user_id, u.username, u.full_name, u.avatar_url, u.is_private
       FROM users u
      WHERE u.deleted_at IS NULL
        AND u.deactivated_at IS NULL
        AND u.id != ?
        AND u.phone IN (${placeholders})
        AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
        AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
      LIMIT ${Number(limit)}`,
    [viewerId, ...normalized, viewerId, viewerId],
  );
  return decorate(viewerId, rows);
}

/** Attach the viewer's relationship to each row so the UI can label buttons. */
async function decorate(viewerId, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.user_id);
  const placeholders = ids.map(() => "?").join(",");
  const edges = await query(
    `SELECT follower_id, following_id, status FROM follows
      WHERE (follower_id = ? AND following_id IN (${placeholders}))
         OR (following_id = ? AND follower_id IN (${placeholders}))`,
    [viewerId, ...ids, viewerId, ...ids],
  );
  const out = new Map(
    ids.map((id) => [
      id,
      { following: false, requested: false, followsYou: false },
    ]),
  );
  for (const e of edges) {
    if (e.follower_id === viewerId) {
      const s = out.get(e.following_id);
      if (s) {
        s.following = e.status === "accepted";
        s.requested = e.status === "pending";
      }
    } else {
      const s = out.get(e.follower_id);
      if (s) s.followsYou = e.status === "accepted";
    }
  }
  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    name: r.full_name || r.username,
    avatarUrl: r.avatar_url,
    isPrivate: !!r.is_private,
    ...out.get(r.user_id),
  }));
}

module.exports = {
  getUser,
  followState,
  setPrivacy,
  follow,
  unfollow,
  respond,
  listRequests,
  listFollowers,
  listFollowing,
  counts,
  canMessage,
  searchByUsername,
  matchContacts,
};
