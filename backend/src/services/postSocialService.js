const crypto = require("crypto");
const { query } = require("../config/db");
const postService = require("./postService");

/**
 * Likes, comments and saves on posts - Instagram's, with one rule over all
 * of it: you can only act on a post you are allowed to see (see
 * utils/postAccess). A post you may not see answers "not found", so nobody
 * can learn that a private account's post exists by poking at its id.
 */

const MAX_COMMENT = 500;

function notFound() {
  const error = new Error("That post is not available.");
  error.status = 404;
  return error;
}

/** The post's owner, if the viewer may see the post; throws 404 otherwise. */
async function requireVisible(viewerId, postId) {
  const [row] = await query("SELECT user_id FROM posts WHERE id = ? LIMIT 1", [String(postId || "")]);
  if (!row) throw notFound();
  if ((await postService.accessFor(viewerId, row.user_id)) !== "open") throw notFound();
  return row.user_id;
}

/** A comment as it is sent: trimmed, no runs of blank lines, at most 500. */
function cleanComment(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_COMMENT);
}

/** Members shown in a list: not deleted, not deactivated, no block either way. */
const MEMBER_COLUMNS = `
  u.id AS user_id, u.username,
  COALESCE(NULLIF(pr.first_name, ''), u.full_name, u.username) AS name,
  COALESCE(
    (SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = u.id ORDER BY ph.position ASC LIMIT 1),
    u.avatar_url
  ) AS avatar`;
const VISIBLE_MEMBER = `
  u.deleted_at IS NULL AND u.deactivated_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM blocks b
                   WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                      OR (b.blocker_id = u.id AND b.blocked_id = ?))`;

const member = (row) => ({
  userId: row.user_id,
  username: row.username,
  name: row.name || row.username,
  avatarUrl: row.avatar || null,
});

async function counts(viewerId, postId) {
  const [post] = await postService.decoratePosts(viewerId, [{ id: postId, user_id: null }]);
  return { likes: post.likes, comments: post.comments, liked: post.liked, saved: post.saved };
}

async function like(viewerId, postId) {
  const ownerId = await requireVisible(viewerId, postId);
  const result = await query("INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)", [postId, viewerId]);
  // Only a new like notifies (not a repeat tap), and the push never holds up the answer.
  if (result.affectedRows) {
    require("./postActivityService").notifyLike(viewerId, postId, ownerId).catch(() => undefined);
  }
  return counts(viewerId, postId);
}

async function unlike(viewerId, postId) {
  await requireVisible(viewerId, postId);
  await query("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [postId, viewerId]);
  return counts(viewerId, postId);
}

/** Who liked a post, newest first. */
async function likers(viewerId, postId) {
  await requireVisible(viewerId, postId);
  const rows = await query(
    `SELECT ${MEMBER_COLUMNS}
       FROM post_likes l
       JOIN users u ON u.id = l.user_id
       LEFT JOIN profiles pr ON pr.user_id = u.id
      WHERE l.post_id = ? AND ${VISIBLE_MEMBER}
      ORDER BY l.created_at DESC
      LIMIT 300`,
    [postId, viewerId, viewerId],
  );
  return rows.map(member);
}

const COMMENT_COLUMNS = `c.id, c.body, c.created_at, c.parent_id, c.reply_to_user_id, ru.username AS reply_to_username, ${MEMBER_COLUMNS}`;
const COMMENT_FROM = `
       FROM post_comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN profiles pr ON pr.user_id = u.id
       LEFT JOIN users ru ON ru.id = c.reply_to_user_id`;

function shapeComment(row, viewerId, ownerId) {
  return {
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    author: member(row),
    // A reply: the comment it sits under, and whom it answers.
    parentId: row.parent_id || null,
    replyTo: row.reply_to_user_id ? { userId: row.reply_to_user_id, username: row.reply_to_username || "" } : null,
    // Your own comment, or any comment on your own post.
    canDelete: row.user_id === viewerId || ownerId === viewerId,
  };
}

/** A post's comments, oldest first (a conversation reads top to bottom). Replies are in the list too, with their parentId. */
async function comments(viewerId, postId) {
  const ownerId = await requireVisible(viewerId, postId);
  const rows = await query(
    `SELECT ${COMMENT_COLUMNS} ${COMMENT_FROM}
      WHERE c.post_id = ? AND ${VISIBLE_MEMBER}
      ORDER BY c.created_at ASC
      LIMIT 500`,
    [postId, viewerId, viewerId],
  );
  return rows.map((row) => shapeComment(row, viewerId, ownerId));
}

/**
 * Adds a comment, or a reply to one (replyTo: the comment answered). A reply
 * to a reply goes under the same top comment, so threads stay one level deep.
 */
async function addComment(viewerId, postId, body, replyTo) {
  const text = cleanComment(body);
  if (!text) {
    const error = new Error("Write something first.");
    error.status = 400;
    throw error;
  }
  const ownerId = await requireVisible(viewerId, postId);
  let parentId = null;
  let replyToUserId = null;
  if (replyTo) {
    const [target] = await query(
      `SELECT c.id, c.parent_id, c.user_id FROM post_comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.id = ? AND c.post_id = ? AND ${VISIBLE_MEMBER}
        LIMIT 1`,
      [String(replyTo), postId, viewerId, viewerId],
    );
    if (!target) {
      const error = new Error("That comment is not there any more.");
      error.status = 404;
      throw error;
    }
    parentId = target.parent_id || target.id;
    replyToUserId = target.user_id;
  }
  const id = crypto.randomUUID();
  await query(
    "INSERT INTO post_comments (id, post_id, user_id, body, parent_id, reply_to_user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [id, postId, viewerId, text, parentId, replyToUserId],
  );
  const [row] = await query(`SELECT ${COMMENT_COLUMNS} ${COMMENT_FROM} WHERE c.id = ?`, [id]);
  const activity = require("./postActivityService");
  // The one answered hears "replied to your comment"; the post's owner hears
  // "commented" - once, never both, and never about their own words.
  if (replyToUserId && replyToUserId !== viewerId) {
    activity.notifyReply(viewerId, postId, replyToUserId, text).catch(() => undefined);
  }
  if (ownerId !== replyToUserId) activity.notifyComment(viewerId, postId, ownerId, text).catch(() => undefined);
  const shaped = row
    ? shapeComment(row, viewerId, ownerId)
    : {
        id,
        body: text,
        created_at: new Date(),
        author: { userId: viewerId, username: "", name: "", avatarUrl: null },
        parentId,
        replyTo: replyToUserId ? { userId: replyToUserId, username: "" } : null,
        canDelete: true,
      };
  return { ...shaped, canDelete: true, ownerId };
}

/** Removes a comment: its writer can, and so can the post's owner. */
async function deleteComment(viewerId, postId, commentId) {
  const ownerId = await requireVisible(viewerId, postId);
  const [row] = await query("SELECT user_id FROM post_comments WHERE id = ? AND post_id = ? LIMIT 1", [
    commentId,
    postId,
  ]);
  if (!row) throw notFound();
  if (row.user_id !== viewerId && ownerId !== viewerId) {
    const error = new Error("You can only delete your own comments.");
    error.status = 403;
    throw error;
  }
  // Its replies go with it.
  await query("DELETE FROM post_comments WHERE post_id = ? AND (id = ? OR parent_id = ?)", [postId, commentId, commentId]);
  return { ok: true };
}

async function save(viewerId, postId) {
  await requireVisible(viewerId, postId);
  await query("INSERT IGNORE INTO post_saves (user_id, post_id) VALUES (?, ?)", [viewerId, postId]);
  return { saved: true };
}

async function unsave(viewerId, postId) {
  // No visibility check: you can always take something out of your own saves.
  await query("DELETE FROM post_saves WHERE user_id = ? AND post_id = ?", [viewerId, postId]);
  return { saved: false };
}

/**
 * Your saved posts, newest save first - only the ones you can still see (a
 * post from an account that went private, or blocked you, drops out).
 */
async function saved(viewerId) {
  const rows = await query(
    `SELECT ${postService.POST_COLUMNS} ${postService.POST_FROM}
       JOIN post_saves s ON s.post_id = p.id AND s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT 300`,
    [viewerId],
  );
  const access = new Map();
  for (const ownerId of new Set(rows.map((row) => row.user_id))) {
    access.set(ownerId, await postService.accessFor(viewerId, ownerId));
  }
  return postService.decoratePosts(
    viewerId,
    rows.filter((row) => access.get(row.user_id) === "open"),
  );
}

module.exports = {
  MAX_COMMENT,
  cleanComment,
  like,
  unlike,
  likers,
  comments,
  addComment,
  deleteComment,
  save,
  unsave,
  saved,
};
