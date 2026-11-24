/**
 * What may be uploaded, and under which name it is saved.
 *
 * Uploads are served from the app's own origin (apnajoda.com/api/uploads),
 * the same origin that holds the member's login token in the browser. If
 * a file could be saved as .html or .svg, opening its link would run its
 * script as the app and read that token. So:
 *
 * - the saved extension comes from this list, never from the uploaded
 *   file name, and anything not on the list is refused;
 * - SVG is not on the list - it is an image that can carry script;
 * - only files with these extensions are served at all (see app.js), so a
 *   bad file saved before this fix is never served either.
 */
const PHOTO_TYPES = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/avif": ".avif",
};

const VIDEO_TYPES = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/3gpp": ".3gp",
  "video/x-m4v": ".m4v",
  "video/x-matroska": ".mkv",
};

const AUDIO_TYPES = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/ogg": ".ogg",
  "audio/opus": ".opus",
  "audio/webm": ".webm",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/3gpp": ".3gp",
  "audio/amr": ".amr",
};

// Documents people send in chat (like WhatsApp): PDFs, Office files, text, zip.
// They are only ever downloaded, never opened inline (see app.js).
const DOCUMENT_TYPES = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
};

const CHAT_TYPES = { ...PHOTO_TYPES, ...VIDEO_TYPES, ...AUDIO_TYPES, ...DOCUMENT_TYPES };

/** Every extension an upload can end up with - the only ones served. */
const SERVABLE_EXTENSIONS = new Set(Object.values(CHAT_TYPES));

/** The document extensions: these are downloaded, not shown inline. */
const DOCUMENT_EXTENSIONS = new Set(Object.values(DOCUMENT_TYPES));

/** "Audio/WebM; codecs=opus" -> "audio/webm" */
function baseType(mimetype) {
  return String(mimetype || "").split(";")[0].trim().toLowerCase();
}

/** The extension to save under, or null if this type is not allowed. */
function extensionFor(mimetype, allowed) {
  return allowed[baseType(mimetype)] || null;
}

module.exports = {
  PHOTO_TYPES,
  CHAT_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_EXTENSIONS,
  SERVABLE_EXTENSIONS,
  baseType,
  extensionFor,
};
