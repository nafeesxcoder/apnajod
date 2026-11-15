const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { ApiError } = require('./errorHandler');
const { extensionFor } = require('../utils/uploadTypes');

/**
 * Songs for the story music library, uploaded by the admin. Kept in
 * uploads/music for as long as the song is in the library.
 */
const MUSIC_DIR = path.join(__dirname, '..', '..', 'uploads', 'music');
fs.mkdirSync(MUSIC_DIR, { recursive: true });

const MAX_MUSIC_BYTES = 10 * 1024 * 1024;

/** Formats every phone and browser can play. */
const MUSIC_TYPES = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
  'audio/m4a': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
};

const musicUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, MUSIC_DIR),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${extensionFor(file.mimetype, MUSIC_TYPES)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (extensionFor(file.mimetype, MUSIC_TYPES)) cb(null, true);
    else cb(new ApiError(400, 'Only MP3, M4A or AAC songs can be added'));
  },
  limits: { fileSize: MAX_MUSIC_BYTES },
});

/** A song's cover picture (square, shown on the music sticker). */
const COVER_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_COVER_BYTES = 3 * 1024 * 1024;

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, MUSIC_DIR),
    filename: (req, file, cb) => cb(null, `cover-${crypto.randomUUID()}${extensionFor(file.mimetype, COVER_TYPES)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (extensionFor(file.mimetype, COVER_TYPES)) cb(null, true);
    else cb(new ApiError(400, 'Only JPG, PNG or WebP pictures can be a cover'));
  },
  limits: { fileSize: MAX_COVER_BYTES },
});

module.exports = { musicUpload, coverUpload, MUSIC_DIR, MAX_MUSIC_BYTES, MUSIC_TYPES, COVER_TYPES };
