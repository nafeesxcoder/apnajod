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

// A suspension has to bite while the member is still holding a valid access
// token, or suspending someone means nothing for the next fifteen minutes -
// which is the whole window that matters in a harassment case. Reading the
// account on every request would be a query per poll, so this caches the
// answer briefly, the same way last-seen is throttled above.
const statusCache = new Map();
const STATUS_TTL_MS = 30 * 1000;

async function isSuspended(userId) {
  const cached = statusCache.get(userId);
  if (cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.suspended;
  try {
    const [account] = await query('SELECT status FROM users WHERE id = ?', [userId]);
    const suspended = account?.status === 'suspended';
    statusCache.set(userId, { suspended, at: Date.now() });
    return suspended;
  } catch {
    // A database hiccup must not lock everyone out.
    return false;
  }
}

/** Called when an account is suspended so the next request sees it at once. */
function forgetAccountStatus(userId) {
  statusCache.delete(userId);
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or invalid Authorization header'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }

  if (await isSuspended(payload.sub)) {
    return next(new ApiError(403, 'This account has been suspended.'));
  }

  req.user = { id: payload.sub };
  touchLastActive(payload.sub);
  next();
}

module.exports = { requireAuth, forgetAccountStatus };
