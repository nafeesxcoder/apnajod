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

// ---------- the follow edge ----------

const follow = asyncHandler(async (req, res) => {
  try {
    const result = await followService.follow(req.user.id, req.params.userId);
    res.json({ ok: true, ...result });
  } catch (error) {
    rethrow(error);
  }
});

const unfollow = asyncHandler(async (req, res) => {
  await followService.unfollow(req.user.id, req.params.userId);
  res.json({ ok: true });
});

const respond = asyncHandler(async (req, res) => {
  const { accept } = req.body;
  if (typeof accept !== "boolean") throw new ApiError(400, "accept must be true or false");
  try {
    const result = await followService.respond(req.user.id, req.params.userId, accept);
    res.json({ ok: true, ...result });
  } catch (error) {
    rethrow(error);
  }
});

const requests = asyncHandler(async (req, res) => {
  const rows = await followService.listRequests(req.user.id);
  res.json({
    ok: true,
    requests: rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      name: r.full_name || r.username,
      avatarUrl: r.avatar_url,
      requestedAt: r.created_at,
    })),
  });
});

const followers = asyncHandler(async (req, res) => {
  const rows = await followService.listFollowers(req.params.userId || req.user.id);
  res.json({ ok: true, users: rows.map(shape) });
});

const following = asyncHandler(async (req, res) => {
  const rows = await followService.listFollowing(req.params.userId || req.user.id);
  res.json({ ok: true, users: rows.map(shape) });
});

// ---------- a person's page ----------

const userProfile = asyncHandler(async (req, res) => {
  const user = await followService.getUser(req.params.userId);
  if (!user) throw new ApiError(404, "That account is not available.");
  const [state, count, permission] = await Promise.all([
    followService.followState(req.user.id, user.id),
    followService.counts(user.id),
    followService.canMessage(req.user.id, user.id),
  ]);
  res.json({
    ok: true,
    user: {
      userId: user.id,
      username: user.username,
      name: user.full_name || user.username,
      avatarUrl: user.avatar_url,
      isPrivate: !!user.is_private,
    },
    counts: count,
    state,
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
  follow,
  unfollow,
  respond,
  requests,
  followers,
  following,
  userProfile,
  privacy,
};
