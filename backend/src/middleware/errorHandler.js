class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

// Upload limits from multer, in words a member understands.
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'That file is too large.',
  LIMIT_FILE_COUNT: 'Too many files at once.',
  LIMIT_UNEXPECTED_FILE: 'That upload was not expected.',
};

function validStatus(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 400 && n <= 599 ? n : null;
}

/**
 * Turns any error into the JSON the app shows.
 *
 * An error we raised on purpose (an ApiError, or one marked with a status
 * such as chatService's 403s) carries a message written for the member, so
 * it is passed on. Anything else - a database error, a TypeError - would
 * leak table names and code details, so the member gets a plain message
 * and the full error goes to the server log only.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: MULTER_MESSAGES[err.code] || 'That upload could not be accepted.' });
  }

  const statusCode = validStatus(err && err.statusCode) || validStatus(err && err.status) || 500;
  const ours = err instanceof ApiError || validStatus(err && err.status) !== null || validStatus(err && err.statusCode) !== null;

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  const message = ours && err.message ? err.message : GENERIC_MESSAGE;
  res.status(statusCode).json({
    error: message,
    ...(ours && err.details ? { details: err.details } : {}),
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler, GENERIC_MESSAGE };
