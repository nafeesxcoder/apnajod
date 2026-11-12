const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { PHOTO_TYPES, extensionFor } = require('../utils/uploadTypes');
const { ApiError } = require('./errorHandler');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads', 'photos'));
  },
  // The extension comes from the checked type, never from the file name -
  // see utils/uploadTypes.js.
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${extensionFor(file.mimetype, PHOTO_TYPES)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (extensionFor(file.mimetype, PHOTO_TYPES)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPG, PNG, WEBP, GIF or HEIC photos are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
});

module.exports = upload;
