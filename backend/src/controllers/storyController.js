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
    const story = await storyService.create(req.user.id, req.file, apiBase, {
      trackId: req.body.musicTrackId,
      start: req.body.musicStart,
      length: req.body.musicLength,
    }, req.body.stickers, req.body.audience);
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

const stickerService = require('../services/storyStickerService');

const voteStory = asyncHandler(async (req, res) => {
  try {
    res.json({ ok: true, ...(await stickerService.vote(req.user.id, req.params.id, String(req.body.stickerId || ''), req.body.choice)) });
  } catch (error) {
    rethrow(error);
  }
});

const answerStory = asyncHandler(async (req, res) => {
  try {
    res.json(await stickerService.answer(req.user.id, req.params.id, String(req.body.stickerId || ''), req.body.body));
  } catch (error) {
    rethrow(error);
  }
});

const likeStory = asyncHandler(async (req, res) => {
  try {
    res.json({ ok: true, ...(await stickerService.like(req.user.id, req.params.id, req.body.liked !== false)) });
  } catch (error) {
    rethrow(error);
  }
});

const storyResponses = asyncHandler(async (req, res) => {
  try {
    res.json({ ok: true, ...(await stickerService.responses(req.user.id, req.params.id)) });
  } catch (error) {
    rethrow(error);
  }
});

module.exports = { createStory, getTray, deleteStory, voteStory, answerStory, likeStory, storyResponses };
