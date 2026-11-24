const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const env = require('../config/env');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { currentRequest } = require('../utils/requestContext');
const { ApiError } = require('../middleware/errorHandler');

function msFromExpiresIn(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * unitMs[unit];
}

/**
 * A short name for a device from its browser or app string: "Chrome on Windows",
 * "Apnajoda app on Android". Shown on "Where you're logged in".
 */
function describeDevice(userAgent = '') {
  const ua = String(userAgent);
  if (!ua) return 'Unknown device';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iOS/i.test(ua)
      ? 'iPhone'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Macintosh|Mac OS/i.test(ua)
          ? 'Mac'
          : /Linux/i.test(ua)
            ? 'Linux'
            : '';
  let browser = '';
  if (/okhttp|Dalvik|CFNetwork|ReactNative/i.test(ua)) browser = 'Apnajoda app';
  else if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else browser = 'Browser';
  return os ? `${browser} on ${os}` : browser;
}

/**
 * A session is one sign-in on one device. Its refresh tokens share a family_id,
 * so the family is what "log out this device" ends. The access token carries
 * that family as `sid`, and requireAuth checks it is still live.
 */
async function issueSession(userId, { familyId = null } = {}) {
  const id = crypto.randomUUID();
  const family = familyId || id;
  const accessToken = signAccessToken({ sub: userId, sid: family });
  const refreshToken = signRefreshToken({ sub: userId });

  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + msFromExpiresIn(env.jwt.refreshExpiresIn));
  const { userAgent = '', ip = '' } = currentRequest();

  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, family_id, device, ip, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [id, userId, tokenHash, expiresAt, family, describeDevice(userAgent).slice(0, 120), String(ip).slice(0, 64)],
  );

  return { accessToken, refreshToken };
}

async function rotateSession(oldRefreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const candidates = await query(
    // A token used in the last minute is still accepted: when two requests
    // (two tabs, or a reply lost on a bad network) refresh at the same moment,
    // the loser must not be signed out.
    `SELECT * FROM refresh_tokens
      WHERE user_id = ? AND expires_at > NOW()
        AND (revoked_at IS NULL OR revoked_at > DATE_SUB(NOW(), INTERVAL 60 SECOND))`,
    [payload.sub],
  );

  let matched = null;
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(oldRefreshToken, candidate.token_hash)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    const err = new Error('Refresh token not recognized or already used');
    err.statusCode = 401;
    throw err;
  }

  const familyId = matched.family_id || matched.id;
  // A device signed out from "Where you're logged in" stays out, even inside the 60-second grace.
  const [live] = await query(
    'SELECT id FROM refresh_tokens WHERE family_id = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
    [familyId],
  );
  if (!live) {
    const err = new Error('This device was signed out.');
    err.statusCode = 401;
    throw err;
  }

  // A suspension taken out while a session was alive must not be renewable.
  const [account] = await query('SELECT status FROM users WHERE id = ?', [payload.sub]);
  if (account?.status === 'suspended') {
    const err = new Error('This account has been suspended.');
    err.statusCode = 403;
    throw err;
  }

  // The new token is saved before the old one is retired, so the device never has a gap.
  const tokens = await issueSession(payload.sub, { familyId });
  if (!matched.revoked_at) {
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [matched.id]);
  }
  return tokens;
}

async function revokeAllSessions(userId) {
  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [userId]);
}

/** Is this device's session still signed in (used on every request that carries a sid). */
async function isSessionActive(familyId, userId) {
  const [row] = await query(
    'SELECT id FROM refresh_tokens WHERE family_id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
    [familyId, userId],
  );
  return !!row;
}

/** Where the account is signed in right now: one entry per device, the one you are on first. */
async function listSessions(userId, currentFamily = null) {
  const rows = await query(
    `SELECT family_id, device, ip, last_used_at FROM refresh_tokens
      WHERE user_id = ? AND family_id IS NOT NULL AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC`,
    [userId],
  );
  const byFamily = new Map();
  for (const row of rows) {
    const seen = byFamily.get(row.family_id);
    if (!seen) {
      byFamily.set(row.family_id, {
        id: row.family_id,
        device: row.device || 'Unknown device',
        ip: row.ip || '',
        lastUsedAt: row.last_used_at,
        signedInAt: null,
        current: row.family_id === currentFamily,
      });
    } else if (row.last_used_at && row.last_used_at > seen.lastUsedAt) {
      seen.lastUsedAt = row.last_used_at;
    }
  }
  if (byFamily.size) {
    const ids = [...byFamily.keys()];
    const marks = ids.map(() => '?').join(', ');
    const starts = await query(
      `SELECT family_id, MIN(created_at) AS signed_in_at FROM refresh_tokens
        WHERE user_id = ? AND family_id IN (${marks}) GROUP BY family_id`,
      [userId, ...ids],
    );
    for (const row of starts) {
      const entry = byFamily.get(row.family_id);
      if (entry) entry.signedInAt = row.signed_in_at;
    }
  }
  return [...byFamily.values()].sort(
    (a, b) => Number(b.current) - Number(a.current) || new Date(b.lastUsedAt) - new Date(a.lastUsedAt),
  );
}

/** Log out one device. */
async function revokeSession(userId, familyId) {
  const result = await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND family_id = ? AND revoked_at IS NULL',
    [userId, familyId],
  );
  if (!result.affectedRows) throw new ApiError(404, 'That device is not signed in.');
  return { ok: true };
}

/** Log out every device except this one. */
async function revokeOtherSessions(userId, currentFamily) {
  if (!currentFamily) throw new ApiError(400, 'Sign in again, then try again.');
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND family_id <> ? AND revoked_at IS NULL',
    [userId, currentFamily],
  );
  return { ok: true };
}

module.exports = {
  issueSession,
  rotateSession,
  revokeAllSessions,
  isSessionActive,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  describeDevice,
};
