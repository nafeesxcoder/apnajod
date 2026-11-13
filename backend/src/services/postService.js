const crypto = require("crypto");
const { query } = require("../config/db");
const { cleanAspect, roundAspect } = require("../utils/postAspect");
const { postAccess } = require("../utils/postAccess");

/**
 * Posts: the photos a member adds to their profile over time, with a line of
 * their own under each.
 *
 * Separate from profile_photos, which are the few pictures the deck shows.
 * These are the ones that give somebody something to open a conversation
 * about, so they are visible to other members — a post only you can see is
 * not worth writing.
 */
/** Most photos in one post. Instagram allows 10; the server here is small. */
const MAX_POST_PHOTOS = 5;

async function createPost(userId, mediaUrl, caption, aspectRatio = 1, mediaUrls = []) {
  const id = crypto.randomUUID();
  const aspect = cleanAspect(aspectRatio);
  // All the photos, first one first; a single photo needs no extra rows.
  const all = [mediaUrl, ...mediaUrls.filter((url) => url !== mediaUrl)].slice(0, MAX_POST_PHOTOS);
  await query(
    "INSERT INTO posts (id, user_id, media_url, caption, aspect_ratio) VALUES (?, ?, ?, ?, ?)",
    [id, userId, all[0], caption || "", aspect],
  );
  if (all.length > 1) {
    await query(
      `INSERT INTO post_media (post_id, position, media_url) VALUES ${all.map(() => "(?, ?, ?)").join(", ")}`,
      all.flatMap((url, position) => [id, position, url]),
    );
  }
  return { id, mediaUrl: all[0], media: all, caption: caption || "", aspect_ratio: aspect };
}

/** Every photo URL of the given posts, for deleting their files. */
async function mediaUrlsOf(postIds) {
  if (!postIds.length) return [];
  const [main, extra] = await Promise.all([
    query(`SELECT media_url FROM posts WHERE id IN (${postIds.map(() => "?").join(", ")})`, postIds),
    query(`SELECT media_url FROM post_media WHERE post_id IN (${postIds.map(() => "?").join(", ")})`, postIds),
  ]);
  return [...new Set([...main, ...extra].map((row) => row.media_url))];
}

const marks = (list) => list.map(() => "?").join(", ");

/**
 * The columns every post goes out with, including who posted it (their
 * first profile photo as the avatar). `p` is posts, `u` users.
 */
const POST_COLUMNS = `
  p.id, p.user_id, p.media_url, p.caption, p.aspect_ratio, p.created_at,
  u.username,
  COALESCE(NULLIF(pr.first_name, ''), u.full_name, u.username) AS author_name,
  COALESCE(
    (SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = u.id ORDER BY ph.position ASC LIMIT 1),
    u.avatar_url
  ) AS author_avatar`;
const POST_FROM = `
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN profiles pr ON pr.user_id = p.user_id`;

/**
 * Adds what Instagram shows under a post: how many likes and comments, and
 * whether the viewer has liked or saved it. Likes and comments from deleted,
 * deactivated or blocked members are not counted, so the number matches
 * the list you see when you open it.
 */
async function decoratePosts(viewerId, rows) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const visibleMember = `
    JOIN users m ON m.id = x.user_id AND m.deleted_at IS NULL AND m.deactivated_at IS NULL
    WHERE x.post_id IN (${marks(ids)})
      AND NOT EXISTS (SELECT 1 FROM blocks b
                       WHERE (b.blocker_id = ? AND b.blocked_id = x.user_id)
                          OR (b.blocker_id = x.user_id AND b.blocked_id = ?))`;
  const [likes, comments, mine, saved, media] = await Promise.all([
    query(`SELECT x.post_id, COUNT(*) AS n FROM post_likes x ${visibleMember} GROUP BY x.post_id`, [...ids, viewerId, viewerId]),
    query(`SELECT x.post_id, COUNT(*) AS n FROM post_comments x ${visibleMember} GROUP BY x.post_id`, [...ids, viewerId, viewerId]),
    query(`SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${marks(ids)})`, [viewerId, ...ids]),
    query(`SELECT post_id FROM post_saves WHERE user_id = ? AND post_id IN (${marks(ids)})`, [viewerId, ...ids]),
    query(`SELECT post_id, media_url FROM post_media WHERE post_id IN (${marks(ids)}) ORDER BY post_id, position`, ids),
  ]);
  const photos = new Map();
  for (const row of media) {
    if (!photos.has(row.post_id)) photos.set(row.post_id, []);
    photos.get(row.post_id).push(row.media_url);
  }
  const count = (list) => new Map(list.map((row) => [row.post_id, Number(row.n) || 0]));
  const likeCounts = count(likes);
  const commentCounts = count(comments);
  const liked = new Set(mine.map((row) => row.post_id));
  const savedSet = new Set(saved.map((row) => row.post_id));
  return rows.map((row) => ({
    id: row.id,
    media_url: row.media_url,
    // Every photo in order (just the one for a single-photo post).
    media: photos.get(row.id) || [row.media_url],
    caption: row.caption || "",
    aspect_ratio: roundAspect(row.aspect_ratio),
    created_at: row.created_at,
    author: {
      userId: row.user_id,
      username: row.username,
      name: row.author_name || row.username,
      avatarUrl: row.author_avatar || null,
    },
    likes: likeCounts.get(row.id) || 0,
    comments: commentCounts.get(row.id) || 0,
    liked: liked.has(row.id),
    saved: savedSet.has(row.id),
  }));
}

/** A member's posts, newest first, as `viewerId` sees them (likes, saves). */
async function getUserPosts(userId, viewerId = userId) {
  const rows = await query(
    `SELECT ${POST_COLUMNS} ${POST_FROM} WHERE p.user_id = ? ORDER BY p.created_at DESC`,
    [userId],
  );
  return decoratePosts(viewerId, rows);
}

const FEED_PAGE = 10;
const CURSOR = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;

/**
 * The Home feed, newest first, like Instagram's: your own posts, every post
 * from a public account, and posts from the people you have matched with
 * (private or not). Never a blocked member's either way round, never a
 * deleted or deactivated account's, never an under-18 profile's.
 *
 * Paged by time: `before` is the `next` cursor from the previous page.
 */
async function getFeed(viewerId, before = null, limit = FEED_PAGE) {
  const size = Math.min(30, Math.max(1, Number(limit) || FEED_PAGE));
  const cursor = typeof before === "string" && CURSOR.test(before) ? before : null;
  const rows = await query(
    `SELECT ${POST_COLUMNS},
            DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s.%f') AS cursor_at
       ${POST_FROM}
      WHERE u.deleted_at IS NULL AND u.deactivated_at IS NULL
        AND (pr.age IS NULL OR pr.age >= 18)
        AND (p.user_id = ?
             OR u.is_private = 0
             OR EXISTS (SELECT 1 FROM mutual_matches mm
                         WHERE (mm.user_a_id = ? AND mm.user_b_id = u.id)
                            OR (mm.user_a_id = u.id AND mm.user_b_id = ?)))
        AND NOT EXISTS (SELECT 1 FROM blocks b
                         WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                            OR (b.blocker_id = u.id AND b.blocked_id = ?))
        AND (? IS NULL OR p.created_at < ?)
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${size + 1}`,
    [viewerId, viewerId, viewerId, viewerId, viewerId, cursor, cursor],
  );
  const page = rows.slice(0, size);
  const posts = await decoratePosts(viewerId, page);
  const next = rows.length > size ? page[page.length - 1].cursor_at : null;
  return { posts, next };
}

/** One post, if the viewer may see it; otherwise null (never "locked"). */
async function getPost(viewerId, postId) {
  const [row] = await query(`SELECT ${POST_COLUMNS} ${POST_FROM} WHERE p.id = ? LIMIT 1`, [postId]);
  if (!row) return null;
  if ((await accessFor(viewerId, row.user_id)) !== "open") return null;
  const [post] = await decoratePosts(viewerId, [row]);
  return post || null;
}

async function countPosts(userId) {
  const [row] = await query("SELECT COUNT(*) AS n FROM posts WHERE user_id = ?", [userId]);
  return Number(row?.n || 0);
}

/**
 * Whether viewerId may see ownerId's posts: "open", "locked" (a private
 * account they have not matched with) or "hidden" (a block either way round,
 * or no such account).
 */
async function accessFor(viewerId, ownerId) {
  if (viewerId === ownerId) return "open";
  const [row] = await query(
    `SELECT u.is_private,
            EXISTS (SELECT 1 FROM blocks
                     WHERE (blocker_id = ? AND blocked_id = u.id)
                        OR (blocker_id = u.id AND blocked_id = ?)) AS blocked,
            EXISTS (SELECT 1 FROM mutual_matches
                     WHERE (user_a_id = ? AND user_b_id = u.id)
                        OR (user_a_id = u.id AND user_b_id = ?)) AS matched
       FROM users u
      WHERE u.id = ? AND u.deleted_at IS NULL AND u.deactivated_at IS NULL`,
    [viewerId, viewerId, viewerId, viewerId, ownerId],
  );
  if (!row) return "hidden";
  return postAccess({
    self: false,
    blocked: !!row.blocked,
    isPrivate: !!row.is_private,
    matched: !!row.matched,
  });
}

/**
 * Someone else's posts, by the rule in utils/postAccess: a private account's
 * posts only reach the people it has matched with, and a block hides them
 * both ways. A locked account still says how many posts it has, as
 * Instagram does - never who it has matched with.
 */
async function getVisiblePosts(viewerId, ownerId) {
  const access = await accessFor(viewerId, ownerId);
  if (access === "hidden") return { posts: [], locked: false, count: 0 };
  if (access === "locked") return { posts: [], locked: true, count: await countPosts(ownerId) };
  const posts = await getUserPosts(ownerId, viewerId);
  return { posts, locked: false, count: posts.length };
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

/** Deletes a post's photo from disk (its likes, comments, saves go by cascade). */
async function removeMediaFile(mediaUrl) {
  const { uploadedFilePath } = require("./userService");
  const file = uploadedFilePath(mediaUrl);
  if (!file) return;
  await require("fs").promises.unlink(file).catch(() => undefined);
}

async function deletePost(userId, postId) {
  const [post] = await query("SELECT media_url FROM posts WHERE id = ? AND user_id = ?", [postId, userId]);
  const files = post ? await mediaUrlsOf([postId]) : [];
  const result = await query("DELETE FROM posts WHERE id = ? AND user_id = ?", [
    postId,
    userId,
  ]);
  if (!result.affectedRows) {
    const error = new Error("That post is not yours, or no longer exists.");
    error.status = 404;
    throw error;
  }
  // The photos go with the post: they used to stay on disk for good.
  for (const url of files) await removeMediaFile(url);
  return { ok: true };
}

/**
 * A moderator removes a reported post: the post, its photo, its likes,
 * comments and saves go; its reports are closed as "actioned"; and the
 * member is told why it disappeared.
 */
async function removePostByAdmin(postId) {
  const [post] = await query("SELECT user_id, media_url FROM posts WHERE id = ? LIMIT 1", [postId]);
  if (!post) {
    const error = new Error("That post no longer exists.");
    error.status = 404;
    throw error;
  }
  const files = await mediaUrlsOf([postId]);
  await query("DELETE FROM posts WHERE id = ?", [postId]);
  for (const url of files) await removeMediaFile(url);
  await query(
    "UPDATE reports SET review_status = 'actioned', reviewed_at = NOW(6) WHERE post_id = ? AND review_status = 'open'",
    [postId],
  );
  await require("./pushService")
    .notifyUser(post.user_id, {
      title: "Your post was removed",
      body: "It went against the Apnajoda community guidelines.",
    })
    .catch(() => undefined);
  return { ok: true };
}

/** A moderator keeps a reported post: its reports are closed as "dismissed". */
async function keepPostByAdmin(postId) {
  const result = await query(
    "UPDATE reports SET review_status = 'dismissed', reviewed_at = NOW(6) WHERE post_id = ? AND review_status = 'open'",
    [postId],
  );
  return { ok: true, closed: result.affectedRows ?? 0 };
}

module.exports = {
  createPost,
  getUserPosts,
  getVisiblePosts,
  getPost,
  getFeed,
  decoratePosts,
  POST_COLUMNS,
  POST_FROM,
  accessFor,
  countPosts,
  updatePost,
  deletePost,
  removePostByAdmin,
  MAX_POST_PHOTOS,
  keepPostByAdmin,
};
