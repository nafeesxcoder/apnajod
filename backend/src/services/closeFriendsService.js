const { query } = require('../config/db');

/**
 * Close friends: the people a member picks to see their close-friends
 * stories. They can pick from their matches and the people they follow or
 * who follow them. Nobody is told they were added or taken off.
 */
const MAX_CLOSE_FRIENDS = 200;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const NOT_BLOCKED = `NOT EXISTS (SELECT 1 FROM blocks b
                    WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                       OR (b.blocker_id = u.id AND b.blocked_id = ?))`;

/** Someone you know here: a match, or a follow either way. Takes your id four times. */
const KNOWN = `(EXISTS (SELECT 1 FROM mutual_matches mm
                         WHERE (mm.user_a_id = ? AND mm.user_b_id = u.id)
                            OR (mm.user_a_id = u.id AND mm.user_b_id = ?))
               OR EXISTS (SELECT 1 FROM follows f
                           WHERE f.status = 'accepted'
                             AND ((f.follower_id = ? AND f.following_id = u.id)
                               OR (f.follower_id = u.id AND f.following_id = ?))))`;

/** Everyone you can pick, those on your list first. */
async function candidates(ownerId) {
  const rows = await query(
    `SELECT u.id, u.username,
            COALESCE(NULLIF(pr.first_name, ''), u.full_name, u.username) AS name,
            COALESCE(
              (SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = u.id ORDER BY ph.position ASC LIMIT 1),
              u.avatar_url
            ) AS avatar,
            (cf.friend_id IS NOT NULL) AS close_friend
       FROM users u
       LEFT JOIN profiles pr ON pr.user_id = u.id
       LEFT JOIN close_friends cf ON cf.owner_id = ? AND cf.friend_id = u.id
      WHERE u.id <> ?
        AND u.deleted_at IS NULL AND u.deactivated_at IS NULL
        AND ${NOT_BLOCKED}
        AND (cf.friend_id IS NOT NULL OR ${KNOWN})
      ORDER BY close_friend DESC, name ASC
      LIMIT 500`,
    [ownerId, ownerId, ownerId, ownerId, ownerId, ownerId, ownerId, ownerId],
  );
  return rows.map((row) => ({
    user: { userId: row.id, username: row.username, name: row.name || row.username, avatarUrl: row.avatar || null },
    closeFriend: !!Number(row.close_friend),
  }));
}

/** Puts someone on your list, or takes them off. */
async function set(ownerId, friendId, close) {
  const id = String(friendId || '');
  if (!id || id === ownerId) throw fail(400, 'Choose someone else.');
  if (!close) {
    await query('DELETE FROM close_friends WHERE owner_id = ? AND friend_id = ?', [ownerId, id]);
    return { closeFriend: false };
  }
  const [known] = await query(
    `SELECT u.id FROM users u
      WHERE u.id = ? AND u.deleted_at IS NULL AND u.deactivated_at IS NULL
        AND ${NOT_BLOCKED} AND ${KNOWN}
      LIMIT 1`,
    [id, ownerId, ownerId, ownerId, ownerId, ownerId, ownerId],
  );
  if (!known) throw fail(404, 'You can add your matches and people you follow.');
  const [{ n } = { n: 0 }] = await query('SELECT COUNT(*) AS n FROM close_friends WHERE owner_id = ?', [ownerId]);
  if (Number(n) >= MAX_CLOSE_FRIENDS) throw fail(400, `Your list can have up to ${MAX_CLOSE_FRIENDS} people.`);
  await query('INSERT IGNORE INTO close_friends (owner_id, friend_id) VALUES (?, ?)', [ownerId, id]);
  return { closeFriend: true };
}

/** The ids on your list. */
async function ids(ownerId) {
  const rows = await query('SELECT friend_id FROM close_friends WHERE owner_id = ?', [ownerId]);
  return new Set(rows.map((row) => row.friend_id));
}

module.exports = { MAX_CLOSE_FRIENDS, candidates, set, ids };
