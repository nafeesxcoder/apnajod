const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { CHAT_TYPES, extensionFor } = require("../utils/uploadTypes");
const { ApiError } = require("./errorHandler");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "chat");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // The extension comes from the checked type, never from the file name -
  // see utils/uploadTypes.js.
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${extensionFor(file.mimetype, CHAT_TYPES)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (extensionFor(file.mimetype, CHAT_TYPES)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only photos, videos or voice notes can be sent"));
  }
};

const chatUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = chatUpload;
