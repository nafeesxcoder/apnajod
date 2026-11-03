const crypto = require("crypto");
const { query } = require("../config/db");

async function createPost(userId, mediaUrl, caption) {
  const id = crypto.randomUUID();
  await query(
    "INSERT INTO posts (id, user_id, media_url, caption) VALUES (?, ?, ?, ?)",
    [id, userId, mediaUrl, caption || ""],
  );
  return { id };
}

async function getUserPosts(userId) {
  return query(
    "SELECT id, media_url, caption, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
}

async function deletePost(userId, postId) {
  await query("DELETE FROM posts WHERE id = ? AND user_id = ?", [
    postId,
    userId,
  ]);
  return { ok: true };
}

module.exports = { createPost, getUserPosts, deletePost };
