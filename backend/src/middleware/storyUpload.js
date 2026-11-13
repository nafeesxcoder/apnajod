const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { PHOTO_TYPES, extensionFor } = require('../utils/uploadTypes');
const { ApiError } = require('./errorHandler');

/**
 * Story photos go in their own folder, uploads/stories, kept as they came
 * (no resizing - any quality the member picks). Everything in this folder
 * is temporary: the story cleanup deletes each file within 24 hours, and
 * also sweeps the folder for anything older than that.
 */
const STORY_DIR = path.join(__dirname, '..', '..', 'uploads', 'stories');
fs.mkdirSync(STORY_DIR, { recursive: true });

/** Biggest story photo accepted. Raise it (and nginx client_max_body_size) with a bigger server. */
const MAX_STORY_BYTES = 20 * 1024 * 1024;

const storyUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, STORY_DIR),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${extensionFor(file.mimetype, PHOTO_TYPES)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (extensionFor(file.mimetype, PHOTO_TYPES)) cb(null, true);
    else cb(new ApiError(400, 'Only JPG, PNG, WEBP, GIF or HEIC photos can be a story'));
  },
  limits: { fileSize: MAX_STORY_BYTES },
});

module.exports = { storyUpload, STORY_DIR, MAX_STORY_BYTES };
