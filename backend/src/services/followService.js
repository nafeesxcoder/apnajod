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
/**
 * Add where the like stands to a row of people.
 *
 * This used to read the `follows` table and return following / requested /
 * followsYou. There is no following on this app any more - the only edge
 * between two members is a like - so a search result labelled itself from
 * a graph nothing writes to, and always said "Like" even to somebody you
 * had already matched with.
 */
async function decorate(viewerId, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.user_id);
  const placeholders = ids.map(() => "?").join(",");

  const [decisions, matches] = await Promise.all([
    query(
      `SELECT actor_id, target_id FROM match_decisions
        WHERE decision = 'interested'
          AND ((actor_id = ? AND target_id IN (${placeholders}))
            OR (target_id = ? AND actor_id IN (${placeholders})))`,
      [viewerId, ...ids, viewerId, ...ids],
    ),
    query(
      `SELECT user_a_id, user_b_id FROM mutual_matches
        WHERE (user_a_id = ? AND user_b_id IN (${placeholders}))
           OR (user_b_id = ? AND user_a_id IN (${placeholders}))`,
      [viewerId, ...ids, viewerId, ...ids],
    ),
  ]);

  const state = new Map(
    ids.map((id) => [id, { iLiked: false, theyLiked: false, matched: false }]),
  );
  for (const row of decisions) {
    if (row.actor_id === viewerId) {
      const s = state.get(row.target_id);
      if (s) s.iLiked = true;
    } else {
      const s = state.get(row.actor_id);
      if (s) s.theyLiked = true;
    }
  }
  for (const row of matches) {
    const other = row.user_a_id === viewerId ? row.user_b_id : row.user_a_id;
    const s = state.get(other);
    if (s) s.matched = true;
  }

  return rows.map((r) => {
    const s = state.get(r.user_id) ?? {
      iLiked: false,
      theyLiked: false,
      matched: false,
    };
    return {
      userId: r.user_id,
      username: r.username,
      name: r.full_name || r.username,
      avatarUrl: r.avatar_url,
      isPrivate: !!r.is_private,
      likeStatus: s.matched
        ? "accepted"
        : s.iLiked
          ? "pending"
          : s.theyLiked
            ? "likes_you"
            : "none",
    };
  });
}

/**
 * The dating profile behind a person page.
 *
 * A person page used to carry a username, an avatar and two follower
 * counts. On a dating app that is nothing to decide from: the member is
 * looking at somebody who liked them and has to judge from a letter in a
 * grey circle. Photos, age, city, work and their own words come too.
 */
async function getProfileCard(userId) {
  const [profile] = await query(
    `SELECT first_name, age, city, profession, religion, community,
            about, verified, hobbies
       FROM profiles
      WHERE user_id = ?`,
    [userId],
  );
  const photos = await query(
    "SELECT photo_url FROM profile_photos WHERE user_id = ? ORDER BY position ASC",
    [userId],
  );

  // mysql2 returns a JSON column already parsed; JSON.parse on it throws.
  let hobbies = [];
  if (Array.isArray(profile?.hobbies)) {
    hobbies = profile.hobbies;
  } else if (typeof profile?.hobbies === "string" && profile.hobbies.trim()) {
    try {
      hobbies = JSON.parse(profile.hobbies);
    } catch {
      hobbies = [];
    }
  }

  return {
    firstName: profile?.first_name || "",
    age: profile?.age || 0,
    city: profile?.city || "",
    profession: profile?.profession || "",
    religion: profile?.religion || "",
    community: profile?.community || "",
    about: profile?.about || "",
    verified: profile?.verified === 1,
    hobbies: Array.isArray(hobbies) ? hobbies : [],
    photos: photos.map((row) => row.photo_url).filter(Boolean),
  };
}

/**
 * Where a like between two people stands, in one round trip.
 *
 *   none       neither has liked the other
 *   pending    you liked them and are waiting
 *   likes_you  they liked you; it is yours to accept
 *   accepted   both of you, so the chat is open
 *
 * The person page needs this to know whether to offer Like, Accept, or
 * nothing but Message. Offering "Like" to somebody you already matched with
 * is how a member ends up unsure whether anything happened at all.
 */
async function likeState(viewerId, otherId) {
  const [row] = await query(
    `SELECT
       EXISTS (SELECT 1 FROM match_decisions
                WHERE actor_id = ? AND target_id = ? AND decision = 'interested') AS i_liked,
       EXISTS (SELECT 1 FROM match_decisions
                WHERE actor_id = ? AND target_id = ? AND decision = 'interested') AS they_liked,
       EXISTS (SELECT 1 FROM mutual_matches
                WHERE (user_a_id = ? AND user_b_id = ?)
                   OR (user_a_id = ? AND user_b_id = ?)) AS matched`,
    [viewerId, otherId, otherId, viewerId, viewerId, otherId, otherId, viewerId],
  );
  const iLiked = !!row?.i_liked;
  const theyLiked = !!row?.they_liked;
  const matched = !!row?.matched;
  return {
    iLiked,
    theyLiked,
    matched,
    status: matched
      ? "accepted"
      : iLiked
        ? "pending"
        : theyLiked
          ? "likes_you"
          : "none",
  };
}

module.exports = {
  getUser,
  getProfileCard,
  likeState,
  setPrivacy,
  canMessage,
  searchByUsername,
  matchContacts,
};
