const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const safetyService = require('../services/safetyService');

function wrap(fn) {
  return asyncHandler(async (req, res) => {
    try {
      const data = await fn(req);
      res.json({ ok: true, saved: true, reason: 'backend', data });
    } catch (error) {
      throw new ApiError(error.status || 500, error.message || 'Request failed');
    }
  });
}

const postReport = wrap(async (req) => {
  const { reportedId, reason, details, reportId } = req.body;
  if (!reportedId || !reason || !reportId)
    throw new ApiError(400, 'reportedId, reason and reportId are required');
  return safetyService.submitReport(req.user.id, reportedId, reason, details, reportId);
});

const postBlock = wrap(async (req) => {
  const { blockedId } = req.body;
  if (!blockedId) throw new ApiError(400, 'blockedId is required');
  return safetyService.blockUser(req.user.id, blockedId);
});

const postUnblock = wrap(async (req) => {
  const { blockedId } = req.body;
  if (!blockedId) throw new ApiError(400, 'blockedId is required');
  return safetyService.unblockUser(req.user.id, blockedId);
});

const getBlockStatus = wrap(async (req) => {
  const { targetId } = req.query;
  if (!targetId) throw new ApiError(400, 'targetId is required');
  const blocked = await safetyService.isBlocked(req.user.id, targetId);
  return { blocked };
});

const postUnmatch = wrap(async (req) => {
  const { targetId } = req.body;
  if (!targetId) throw new ApiError(400, 'targetId is required');
  return safetyService.unmatchUser(req.user.id, targetId);
});

module.exports = { postReport, postBlock, postUnblock, getBlockStatus, postUnmatch };