const { verifyAccessToken } = require('../utils/jwt');
const { ApiError } = require('./errorHandler');
const { query } = require('../config/db');

// Backs the "last seen" feature: every authenticated request touches this
// user's last_active_at, which other screens read to show "Last seen 5
// minutes ago" / online status. Writing it on literally every request would
// be a write on nearly every API call, so this throttles to at most once
// every 30 seconds per user, kept in memory (fine for a single backend
// instance; a cold start just means the first request after a restart
// writes immediately).
const lastTouchByUser = new Map();
const TOUCH_THROTTLE_MS = 30 * 1000;

function touchLastActive(userId) {
  const now = Date.now();
  const last = lastTouchByUser.get(userId) || 0;
  if (now - last < TOUCH_THROTTLE_MS) return;
  lastTouchByUser.set(userId, now);
  query('UPDATE users SET last_active_at = NOW(6) WHERE id = ?', [userId]).catch(
    () => undefined,
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or invalid Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    touchLastActive(payload.sub);
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired access token'));
  }
}

module.exports = { requireAuth };
