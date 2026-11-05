const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const postService = require("../services/postService");

/** A caption is a line under a photo, not an essay. */
const MAX_CAPTION = 300;

function cleanCaption(value) {
  const caption = typeof value === "string" ? value.trim() : "";
  if (caption.length > MAX_CAPTION) {
    throw new ApiError(400, `A caption can be up to ${MAX_CAPTION} characters.`);
  }
  return caption;
}

const createPost = asyncHandler(async (req, res) => {
  const { mediaUrl } = req.body;
  // The photo must already be on this server: a device path would store a
  // reference nobody else could open, which is how the selfie queue ended up
  // holding links that went nowhere.
  if (typeof mediaUrl !== "string" || !/^https?:\/\//i.test(mediaUrl)) {
    throw new ApiError(400, "Upload the photo first, then post it.");
  }
  const post = await postService.createPost(
    req.user.id,
    mediaUrl,
    cleanCaption(req.body.caption),
  );
  res.json({ ok: true, post });
});

const getMyPosts = asyncHandler(async (req, res) => {
  const posts = await postService.getUserPosts(req.user.id);
  res.json({ ok: true, posts });
});

const getUserPosts = asyncHandler(async (req, res) => {
  const posts = await postService.getVisiblePosts(req.user.id, req.params.userId);
  res.json({ ok: true, posts });
});

const updatePost = asyncHandler(async (req, res) => {
  const post = await postService.updatePost(
    req.user.id,
    req.params.id,
    cleanCaption(req.body.caption),
  );
  res.json({ ok: true, post });
});

const deletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.user.id, req.params.id);
  res.json({ ok: true });
});

module.exports = { createPost, getMyPosts, getUserPosts, updatePost, deletePost };
