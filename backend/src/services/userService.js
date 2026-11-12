const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
async function findUserByPhone(phone) {
  const rows = await query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  return rows[0] || null;
}
async function findUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}
async function findUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}
async function createUser({
  phone = null,
  email = null,
  fullName = null,
  avatarUrl = null,
  username = null,
  passwordHash = null,
}) {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO users (id, phone, email, username, password_hash, full_name, avatar_url, phone_verified_at, email_verified_at, password_changed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ${phone ? 'NOW()' : 'NULL'}, ${email ? 'NOW()' : 'NULL'}, ${passwordHash ? 'NOW()' : 'NULL'})`,
    [id, phone, email, username, passwordHash, fullName, avatarUrl],
  );
  return findUserById(id);
}

// ---------- Username + password ----------

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]{2,19}$/;

function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}

/** Returns an error message, or '' when the username is well formed. */
function validateUsername(value) {
  const name = normalizeUsername(value);
  if (!name) return 'Choose a username.';
  if (name.length < 3) return 'Use at least 3 characters.';
  if (name.length > 20) return 'Use at most 20 characters.';
  if (!/^[a-z0-9]/.test(name)) return 'Start with a letter or a number.';
  if (!/^[a-z0-9._]+$/.test(name)) return 'Use only letters, numbers, dots and underscores.';
  return '';
}

function validatePassword(value) {
  return String(value ?? '').length >= 6 ? '' : 'Use at least 6 characters.';
}

async function findUserByUsername(username) {
  const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [normalizeUsername(username)]);
  return rows[0] || null;
}

/**
 * A member can sign in with either their username or their mobile number,
 * so the login form only needs one field.
 */
async function findUserByIdentifier(identifier, normalizePhone) {
  const raw = String(identifier ?? '').trim();
  if (!raw) return null;
  const phone = normalizePhone ? normalizePhone(raw) : null;
  if (phone) {
    const byPhone = await findUserByPhone(phone);
    if (byPhone) return byPhone;
  }
  if (raw.includes('@')) {
    const byEmail = await findUserByEmail(raw.toLowerCase());
    if (byEmail) return byEmail;
  }
  return findUserByUsername(raw);
}

async function isUsernameAvailable(username) {
  return (await findUserByUsername(username)) === null;
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), 12);
}

async function verifyPassword(user, password) {
  if (!user || !user.password_hash) return false;
  return bcrypt.compare(String(password), user.password_hash);
}

async function setPassword(userId, password, { mustChange = false } = {}) {
  const passwordHash = await hashPassword(password);
  await query(
    `UPDATE users
        SET password_hash = ?, password_changed_at = NOW(), must_change_password = ?,
            failed_login_count = 0, locked_until = NULL
      WHERE id = ?`,
    [passwordHash, mustChange ? 1 : 0, userId],
  );
}

async function setUsername(userId, username) {
  await query('UPDATE users SET username = ? WHERE id = ?', [normalizeUsername(username), userId]);
}

// ---------- Failed sign-in throttling ----------

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;

function lockRemainingMinutes(user) {
  if (!user?.locked_until) return 0;
  const ms = new Date(user.locked_until).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

async function recordFailedLogin(userId) {
  await query(
    `UPDATE users
        SET failed_login_count = failed_login_count + 1,
            locked_until = IF(failed_login_count + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), locked_until)
      WHERE id = ?`,
    [MAX_FAILED_LOGINS, LOCK_MINUTES, userId],
  );
}

async function clearFailedLogins(userId) {
  await query(
    'UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ? AND (failed_login_count > 0 OR locked_until IS NOT NULL)',
    [userId],
  );
}
async function markPhoneVerified(userId) {
  await query('UPDATE users SET phone_verified_at = NOW() WHERE id = ?', [userId]);
}
async function markEmailVerified(userId) {
  await query('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [userId]);
}
async function findOrCreateByOAuth({ provider, providerUserId, email, fullName, avatarUrl }) {
  const existingLink = await query(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ? LIMIT 1',
    [provider, providerUserId],
  );
  if (existingLink[0]) {
    return findUserById(existingLink[0].user_id);
  }
  let user = email ? await findUserByEmail(email) : null;
  if (!user) {
    user = await createUser({ email, fullName, avatarUrl });
  }
  const linkId = crypto.randomUUID();
  await query(
    'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email) VALUES (?, ?, ?, ?, ?)',
    [linkId, user.id, provider, providerUserId, email],
  );
  return user;
}

// ---------- Soft delete (30-day grace period, Instagram-style) ----------
async function softDeleteUser(userId) {
  await query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
}

async function restoreUser(userId) {
  await query('UPDATE users SET deleted_at = NULL WHERE id = ?', [userId]);
}

function isWithinGracePeriod(deletedAt) {
  if (!deletedAt) return false;
  const deletedTime = new Date(deletedAt).getTime();
  const daysSince = (Date.now() - deletedTime) / (1000 * 60 * 60 * 24);
  return daysSince <= 30;
}

// ---------- Permanent delete after the 30-day grace period ----------

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

/**
 * The file on this server behind an uploaded media URL, or null if the URL
 * is not one of our uploads. Only a bare file name inside uploads/photos or
 * uploads/chat is ever returned, so a strange URL cannot point anywhere else.
 */
function uploadedFilePath(url) {
  const match = /\/uploads\/(photos|chat)\/([A-Za-z0-9._-]+)$/.exec(
    String(url || '').split(/[?#]/)[0],
  );
  if (!match || match[2].startsWith('.')) return null;
  return path.join(UPLOADS_DIR, match[1], match[2]);
}

// pool.execute does not expand arrays, so IN lists get one ? per id.
const marks = (list) => list.map(() => '?').join(', ');

async function mediaOf(userIds) {
  const [photos, selfies, posts] = await Promise.all([
    query(`SELECT photo_url AS url FROM profile_photos WHERE user_id IN (${marks(userIds)})`, userIds),
    query(`SELECT selfie_uri AS url FROM profiles WHERE user_id IN (${marks(userIds)})`, userIds),
    query(`SELECT media_url AS url FROM posts WHERE user_id IN (${marks(userIds)})`, userIds),
  ]);
  return [...photos, ...selfies, ...posts]
    .map((row) => uploadedFilePath(row.url))
    .filter(Boolean);
}

/**
 * Permanently removes accounts deleted more than 30 days ago, as the
 * privacy policy promises. Foreign keys cascade, so profile, photos, likes
 * and the rest go with the user row - except payments, which are kept for
 * tax records (042_keep_payment_records.sql). Their photo, selfie and post
 * files are removed from disk too. Runs in batches; returns how many went.
 */
async function purgeExpiredDeletedUsers({ batch = 200 } = {}) {
  const expired = await query(
    `SELECT id FROM users
      WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      LIMIT ${Number(batch)}`,
  );
  if (!expired.length) return 0;
  const ids = expired.map((row) => row.id);
  const files = await mediaOf(ids);

  // Re-check deleted_at, so someone who logged back in a moment ago stays.
  const result = await query(
    `DELETE FROM users
      WHERE id IN (${marks(ids)}) AND deleted_at IS NOT NULL
        AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    ids,
  );
  if ((result.affectedRows || 0) === ids.length) {
    // Files only once the rows are gone - and if any account was kept,
    // leave every file rather than guess whose is whose.
    await Promise.all(files.map((file) => fs.promises.unlink(file).catch(() => undefined)));
  }
  return result.affectedRows || 0;
}

// ---------- Temporary deactivation (Instagram-style, reversible any time) ----------
async function deactivateUser(userId) {
  await query('UPDATE users SET deactivated_at = NOW() WHERE id = ?', [userId]);
}

async function reactivateUser(userId) {
  await query('UPDATE users SET deactivated_at = NULL WHERE id = ?', [userId]);
}

module.exports = {
  findUserByPhone,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  findUserByIdentifier,
  isUsernameAvailable,
  normalizeUsername,
  validateUsername,
  validatePassword,
  hashPassword,
  verifyPassword,
  setPassword,
  setUsername,
  lockRemainingMinutes,
  recordFailedLogin,
  clearFailedLogins,
  createUser,
  markPhoneVerified,
  markEmailVerified,
  findOrCreateByOAuth,
  softDeleteUser,
  restoreUser,
  isWithinGracePeriod,
  purgeExpiredDeletedUsers,
  uploadedFilePath,
  deactivateUser,
  reactivateUser,
};