const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const matchService = require("../services/matchService");
const sparkService = require("../services/sparkService");

const decide = asyncHandler(async (req, res) => {
  const { targetId, decision } = req.body;
  if (!targetId) throw new ApiError(400, "targetId is required");
  if (!["interested", "pass"].includes(decision)) {
    throw new ApiError(400, 'decision must be "interested" or "pass"');
  }
  if (targetId === req.user.id) {
    throw new ApiError(400, "Cannot decide on your own profile");
  }
  const result = await matchService.recordDecision(
    req.user.id,
    targetId,
    decision,
  );
  res.json(result);
});

const getMatches = asyncHandler(async (req, res) => {
  const matches = await matchService.getMutualMatches(req.user.id);
  res.json({ ok: true, matches });
});

const getIncomingLikes = asyncHandler(async (req, res) => {
  const likes = await matchService.getIncomingLikes(req.user.id);
  res.json({ ok: true, likes });
});

const getNotifications = asyncHandler(async (req, res) => {
  const unread = await matchService.notificationCount(req.user.id);
  res.json({ ok: true, unread });
});

const markNotificationsSeen = asyncHandler(async (req, res) => {
  await matchService.markNotificationsSeen(req.user.id);
  res.json({ ok: true, unread: 0 });
});

const getSparkWallet = asyncHandler(async (req, res) => {
  const wallet = await sparkService.wallet(req.user.id);
  res.json({ ok: true, wallet });
});

const sendSpark = asyncHandler(async (req, res) => {
  const { targetId, kind = "spark", note } = req.body || {};
  const result = await sparkService.send(
    req.user.id,
    targetId,
    kind,
    note,
    matchService.recordDecision,
  );
  res.json(result);
});

const search = asyncHandler(async (req, res) => {
  const filters = {
    minAge: req.query.minAge ? Number(req.query.minAge) : 21,
    maxAge: req.query.maxAge ? Number(req.query.maxAge) : 45,
    city: req.query.city,
    gender: req.query.gender,
    verified: req.query.verified === "true",
    minKundliScore: req.query.minKundliScore ? Number(req.query.minKundliScore) : null,
    limit: req.query.limit ? Number(req.query.limit) : 20
  };
  const results = await matchService.searchProfiles(req.user.id, filters);
  res.json({ ok: true, results, count: results.length });
});

const getEnhancedNotifications = asyncHandler(async (req, res) => {
  const type = req.query.type || "all";
  const count = await matchService.getEnhancedNotifications(req.user.id, type);
  res.json({ ok: true, count, type });
});

const getRecommendations = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const recommendations = await matchService.getRecommendations(req.user.id, limit);
  res.json({ ok: true, recommendations, count: recommendations.length });
});

module.exports = {
  decide,
  getSparkWallet,
  sendSpark,
  getMatches,
  getIncomingLikes,
  getNotifications,
  markNotificationsSeen,
  search,
  getEnhancedNotifications,
  getRecommendations,
};
