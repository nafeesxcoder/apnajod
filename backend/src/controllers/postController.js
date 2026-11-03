const asyncHandler = require("../utils/asyncHandler");
const postService = require("../services/postService");

const createPost = asyncHandler(async (req, res) => {
  const { mediaUrl, caption } = req.body;
  if (!mediaUrl) throw new Error("mediaUrl is required");
  const result = await postService.createPost(req.user.id, mediaUrl, caption);
  res.json({ ok: true, post: result });
});

const getMyPosts = asyncHandler(async (req, res) => {
  const posts = await postService.getUserPosts(req.user.id);
  res.json({ ok: true, posts });
});

const deletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.user.id, req.params.id);
  res.json({ ok: true });
});

module.exports = { createPost, getMyPosts, deletePost };
