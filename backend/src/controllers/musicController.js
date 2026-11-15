const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const musicService = require('../services/musicService');
const env = require('../config/env');

function rethrow(error) {
  if (error && error.status) throw new ApiError(error.status, error.message);
  throw error;
}

/** Members: find a song for a story. */
const searchMusic = asyncHandler(async (req, res) => {
  res.json({ ok: true, tracks: await musicService.search(req.query.q) });
});

/** Admin: the whole library. */
const listMusic = asyncHandler(async (req, res) => {
  res.json({ ok: true, tracks: await musicService.list() });
});

// The same public address the photo uploads use.
const publicBase = (req) =>
  /localhost|127\.0\.0\.1/.test(env.apiUrl || '') ? `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}` : env.apiUrl;

const addMusic = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose a song file.');
  try {
    const apiBase = publicBase(req);
    const track = await musicService.add({
      title: req.body.title,
      artist: req.body.artist,
      durationSec: req.body.durationSec,
      file: req.file,
      publicBase: apiBase,
    });
    res.json({ ok: true, track });
  } catch (error) {
    rethrow(error);
  }
});

const deleteMusic = asyncHandler(async (req, res) => {
  try {
    res.json(await musicService.remove(req.params.id));
  } catch (error) {
    rethrow(error);
  }
});

const setMusicDuration = asyncHandler(async (req, res) => {
  try {
    res.json(await musicService.setDuration(req.params.id, req.body.durationSec));
  } catch (error) {
    rethrow(error);
  }
});

const setMusicLyrics = asyncHandler(async (req, res) => {
  try {
    res.json(await musicService.setLyrics(req.params.id, req.body.lyrics));
  } catch (error) {
    rethrow(error);
  }
});

const setMusicCover = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose a picture.');
  try {
    res.json(await musicService.setCover(req.params.id, req.file, publicBase(req)));
  } catch (error) {
    rethrow(error);
  }
});

module.exports = { searchMusic, listMusic, addMusic, deleteMusic, setMusicDuration, setMusicLyrics, setMusicCover };
