const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const storyService = require('../services/storyService');
const env = require('../config/env');

function rethrow(error) {
  if (error && error.status) throw new ApiError(error.status, error.message);
  throw error;
}

const createStory = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose a photo for your story.');
  try {
    // The same public address the photo uploads use.
    const apiBase = /localhost|127\.0\.0\.1/.test(env.apiUrl || '')
      ? `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`
      : env.apiUrl;
    const story = await storyService.create(req.user.id, req.file, apiBase);
    res.json({ ok: true, story });
  } catch (error) {
    rethrow(error);
  }
});

const getTray = asyncHandler(async (req, res) => {
  res.json({ ok: true, people: await storyService.tray(req.user.id) });
});

const deleteStory = asyncHandler(async (req, res) => {
  try {
    res.json(await storyService.remove(req.user.id, req.params.id));
  } catch (error) {
    rethrow(error);
  }
});

module.exports = { createStory, getTray, deleteStory };
