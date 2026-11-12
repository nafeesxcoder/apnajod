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

module.exports = {
  decide,
  getSparkWallet,
  sendSpark,
  getMatches,
  getIncomingLikes,
};
