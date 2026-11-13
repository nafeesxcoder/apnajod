const crypto = require("crypto");
const { query } = require("../config/db");
const { cleanAspect, roundAspect } = require("../utils/postAspect");

/**
 * Posts: the photos a member adds to their profile over time, with a line of
 * their own under each.
 *
 * Separate from profile_photos, which are the few pictures the deck shows.
 * These are the ones that give somebody something to open a conversation
 * about, so they are visible to other members — a post only you can see is
 * not worth writing.
 */
async function createPost(userId, mediaUrl, caption, aspectRatio = 1) {
  const id = crypto.randomUUID();
  const aspect = cleanAspect(aspectRatio);
  await query(
    "INSERT INTO posts (id, user_id, media_url, caption, aspect_ratio) VALUES (?, ?, ?, ?, ?)",
    [id, userId, mediaUrl, caption || "", aspect],
  );
  return { id, mediaUrl, caption: caption || "", aspect_ratio: aspect };
}

async function getUserPosts(userId) {
  const rows = await query(
    "SELECT id, media_url, caption, aspect_ratio, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
  return rows.map((row) => ({ ...row, aspect_ratio: roundAspect(row.aspect_ratio) }));
}

/**
 * Someone else's posts. Hidden either way round a block, so a blocked member
 * cannot keep reading, and a blocker is not shown the person they blocked.
 */
async function getVisiblePosts(viewerId, ownerId) {
  const blocked = await query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?)
         OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1`,
    [viewerId, ownerId, ownerId, viewerId],
  );
  if (blocked.length) return [];
  return getUserPosts(ownerId);
}

/**
 * Change the words under a post, never the photo: editing the picture under
 * a caption other people have already seen is a different thing from fixing
 * a typo, and nobody asked for it.
 */
async function updatePost(userId, postId, caption) {
  const result = await query(
    "UPDATE posts SET caption = ? WHERE id = ? AND user_id = ?",
    [caption || "", postId, userId],
  );
  if (!result.affectedRows) {
    const error = new Error("That post is not yours, or no longer exists.");
    error.status = 404;
    throw error;
  }
  return { id: postId, caption: caption || "" };
}

async function deletePost(userId, postId) {
  const result = await query("DELETE FROM posts WHERE id = ? AND user_id = ?", [
    postId,
    userId,
  ]);
  if (!result.affectedRows) {
    const error = new Error("That post is not yours, or no longer exists.");
    error.status = 404;
    throw error;
  }
  return { ok: true };
}

module.exports = {
  createPost,
  getUserPosts,
  getVisiblePosts,
  updatePost,
  deletePost,
};
