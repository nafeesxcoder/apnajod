const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const followService = require("../services/followService");
const postService = require("../services/postService");

function rethrow(error) {
  if (error && error.status) throw new ApiError(error.status, error.message);
  throw error;
}

const search = asyncHandler(async (req, res) => {
  const term = String(req.query.q || "").trim();
  if (term.length < 2) {
    return res.json({
      ok: true,
      results: [],
      reason: "Type at least 2 characters.",
    });
  }
  const results = await followService.searchByUsername(req.user.id, term);
  res.json({ ok: true, results });
});

const contacts = asyncHandler(async (req, res) => {
  const { phones } = req.body;
  if (!Array.isArray(phones))
    throw new ApiError(400, "phones must be an array");
  const { matched, unmatched } = await followService.matchContacts(
    req.user.id,
    phones,
  );
  res.json({ ok: true, matched, unmatched });
});

const userProfile = asyncHandler(async (req, res) => {
  const user = await followService.getUser(req.params.userId);
  if (!user) throw new ApiError(404, "That account is not available.");
  const [permission, profile, like, postAccess, postsCount] = await Promise.all([
    followService.canMessage(req.user.id, user.id),
    followService.getProfileCard(user.id),
    followService.likeState(req.user.id, user.id),
    postService.accessFor(req.user.id, user.id),
    postService.countPosts(user.id),
  ]);
  // A private account, like on Instagram: until you match, you see who they
  // are (one photo, name, bio) but not their posts or the rest of their photos.
  const locked = postAccess === "locked";
  if (locked) profile.photos = profile.photos.slice(0, 1);
  res.json({
    ok: true,
    user: {
      userId: user.id,
      username: user.username,
      name: profile.firstName || user.full_name || user.username,
      avatarUrl: profile.photos[0] || user.avatar_url,
      isPrivate: !!user.is_private,
    },
    profile,
    like,
    state: { self: req.user.id === user.id },
    posts: { count: postsCount, locked },
    canMessage: permission.allowed,
    messageBlockedReason: permission.allowed ? null : permission.reason,
  });
});

const privacy = asyncHandler(async (req, res) => {
  const { isPrivate } = req.body;
  if (typeof isPrivate !== "boolean")
    throw new ApiError(400, "isPrivate must be true or false");
  await followService.setPrivacy(req.user.id, isPrivate);
  res.json({ ok: true, isPrivate });
});

function shape(r) {
  return {
    userId: r.user_id,
    username: r.username,
    name: r.full_name || r.username,
    avatarUrl: r.avatar_url,
    isPrivate: !!r.is_private,
  };
}

module.exports = {
  search,
  contacts,
  userProfile,
  privacy,
};
