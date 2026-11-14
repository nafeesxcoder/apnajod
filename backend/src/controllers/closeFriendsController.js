const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const closeFriendsService = require('../services/closeFriendsService');

const rethrow = (error) => {
  if (error.status) throw new ApiError(error.status, error.message);
  throw error;
};

const listCloseFriends = asyncHandler(async (req, res) => {
  res.json({ ok: true, people: await closeFriendsService.candidates(req.user.id) });
});

const setCloseFriend = asyncHandler(async (req, res) => {
  try {
    res.json({ ok: true, ...(await closeFriendsService.set(req.user.id, req.params.userId, req.body.close !== false)) });
  } catch (error) {
    rethrow(error);
  }
});

module.exports = { listCloseFriends, setCloseFriend };
