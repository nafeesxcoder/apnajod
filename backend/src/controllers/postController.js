const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const postService = require("../services/postService");
const postSocialService = require("../services/postSocialService");
const { cleanAspect } = require("../utils/postAspect");

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
  // More photos for a swipeable post: each one uploaded here first too.
  const extra = Array.isArray(req.body.mediaUrls) ? req.body.mediaUrls : [];
  if (extra.length > postService.MAX_POST_PHOTOS) {
    throw new ApiError(400, `A post can have up to ${postService.MAX_POST_PHOTOS} photos.`);
  }
  if (extra.some((url) => typeof url !== "string" || !/^https?:\/\//i.test(url))) {
    throw new ApiError(400, "Upload every photo first, then post them.");
  }
  const post = await postService.createPost(
    req.user.id,
    mediaUrl,
    cleanCaption(req.body.caption),
    cleanAspect(req.body.aspectRatio),
    extra,
  );
  res.json({ ok: true, post });
});

const getMyPosts = asyncHandler(async (req, res) => {
  const posts = await postService.getUserPosts(req.user.id);
  res.json({ ok: true, posts });
});

const getUserPosts = asyncHandler(async (req, res) => {
  const { posts, locked, count } = await postService.getVisiblePosts(req.user.id, req.params.userId);
  res.json({ ok: true, posts, locked, count });
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

// ---- likes, comments, saves (postSocialService) ----

function rethrow(error) {
  if (error && error.status) throw new ApiError(error.status, error.message);
  throw error;
}
const social = (work) =>
  asyncHandler(async (req, res) => {
    try {
      res.json({ ok: true, ...(await work(req)) });
    } catch (error) {
      rethrow(error);
    }
  });

const getPost = social(async (req) => {
  const post = await postService.getPost(req.user.id, req.params.id);
  if (!post) throw new ApiError(404, "That post is not available.");
  return { post };
});
const likePost = social((req) => postSocialService.like(req.user.id, req.params.id));
const unlikePost = social((req) => postSocialService.unlike(req.user.id, req.params.id));
const getLikers = social(async (req) => ({ users: await postSocialService.likers(req.user.id, req.params.id) }));
const getComments = social(async (req) => ({ comments: await postSocialService.comments(req.user.id, req.params.id) }));
const addComment = social(async (req) => {
  const { ownerId: _owner, ...comment } = await postSocialService.addComment(req.user.id, req.params.id, req.body.body);
  return { comment };
});
const deleteComment = social((req) =>
  postSocialService.deleteComment(req.user.id, req.params.id, req.params.commentId),
);
const savePost = social((req) => postSocialService.save(req.user.id, req.params.id));
const unsavePost = social((req) => postSocialService.unsave(req.user.id, req.params.id));
const getSaved = social(async (req) => ({ posts: await postSocialService.saved(req.user.id) }));
const getFeed = social((req) => postService.getFeed(req.user.id, req.query.before, req.query.limit));
const getActivity = social((req) => require("../services/postActivityService").activity(req.user.id));
const getActivityUnread = social(async (req) => ({
  unread: await require("../services/postActivityService").unreadCount(req.user.id),
}));
const markActivitySeen = social((req) => require("../services/postActivityService").markSeen(req.user.id));

module.exports = {
  createPost,
  getMyPosts,
  getUserPosts,
  updatePost,
  deletePost,
  getPost,
  likePost,
  unlikePost,
  getLikers,
  getComments,
  addComment,
  deleteComment,
  savePost,
  unsavePost,
  getSaved,
  getFeed,
  getActivity,
  getActivityUnread,
  markActivitySeen,
};
