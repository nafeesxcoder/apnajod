const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const followService = require("../services/followService");

/** Turn a service error carrying a status into the API's error shape. */
function rethrow(error) {
  if (error && error.status) throw new ApiError(error.status, error.message);
  throw error;
}

// ---------- discovery ----------

const search = asyncHandler(async (req, res) => {
  const term = String(req.query.q || "").trim();
  if (term.length < 2) {
    return res.json({ ok: true, results: [], reason: "Type at least 2 characters." });
  }
  const results = await followService.searchByUsername(req.user.id, term);
  res.json({ ok: true, results });
});

const contacts = asyncHandler(async (req, res) => {
  const { phones } = req.body;
  if (!Array.isArray(phones)) throw new ApiError(400, "phones must be an array");
  const results = await followService.matchContacts(req.user.id, phones);
  res.json({ ok: true, results });
});

// ---------- a person's page ----------

const userProfile = asyncHandler(async (req, res) => {
  const user = await followService.getUser(req.params.userId);
  if (!user) throw new ApiError(404, "That account is not available.");
  const [permission, profile, like] = await Promise.all([
    followService.canMessage(req.user.id, user.id),
    followService.getProfileCard(user.id),
    followService.likeState(req.user.id, user.id),
  ]);
  res.json({
    ok: true,
    user: {
      userId: user.id,
      username: user.username,
      // The profile's own first name beats the account's, which is often
      // just the username again.
      name: profile.firstName || user.full_name || user.username,
      avatarUrl: profile.photos[0] || user.avatar_url,
      isPrivate: !!user.is_private,
    },
    profile,
    like,
    // `self` is all the old follow `state` object still carried that
    // anything reads; the rest described a graph this app no longer has.
    state: { self: req.user.id === user.id },
    canMessage: permission.allowed,
    messageBlockedReason: permission.allowed ? null : permission.reason,
  });
});

const privacy = asyncHandler(async (req, res) => {
  const { isPrivate } = req.body;
  if (typeof isPrivate !== "boolean") throw new ApiError(400, "isPrivate must be true or false");
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
