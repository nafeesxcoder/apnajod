/**
 * Authenticator app codes (TOTP, RFC 6238): the 6-digit code that Microsoft
 * Authenticator, Google Authenticator and similar apps show every 30 seconds.
 * Built on Node's crypto, so there is no extra library to trust.
 */
const crypto = require('crypto');
const fc = require('./fieldCrypto');

const STEP_SECONDS = 30;
const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ISSUER = 'Apnajoda';

function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  }
  return out;
}

function base32Decode(text) {
  const bits = [...String(text).toUpperCase().replace(/=+$/, '')]
    .map((ch) => ALPHABET.indexOf(ch))
    .filter((v) => v >= 0)
    .map((v) => v.toString(2).padStart(5, '0'))
    .join('');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/** The 6-digit code for one 30-second step (HOTP over the step number). */
function codeAt(secret, step) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(step));
  const hash = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const value =
    ((hash[offset] & 0x7f) << 24) |
    (hash[offset + 1] << 16) |
    (hash[offset + 2] << 8) |
    hash[offset + 3];
  return String(value % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * The step the code matches, or -1. One step either side is allowed, for a
 * phone clock that is a little off.
 */
function matchStep(secret, code, now = Date.now()) {
  const typed = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(typed)) return -1;
  const current = Math.floor(now / 1000 / STEP_SECONDS);
  for (let step = current - 1; step <= current + 1; step += 1) {
    const expected = Buffer.from(codeAt(secret, step));
    if (expected.length === typed.length && crypto.timingSafeEqual(expected, Buffer.from(typed))) {
      return step;
    }
  }
  return -1;
}

function otpauthUrl(account, secret) {
  const label = encodeURIComponent(`${ISSUER}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/**
 * Checks a code for this user's enabled authenticator and stops it being
 * used twice (the same 30-second code cannot be entered again).
 */
async function verifyForUser(query, user, code) {
  const secret = fc.decrypt(user.totp_secret);
  if (!secret) return false;
  const step = matchStep(secret, code);
  if (step < 0) return false;
  if (user.totp_last_step !== null && user.totp_last_step !== undefined && step <= Number(user.totp_last_step)) {
    return false;
  }
  await query('UPDATE users SET totp_last_step = ? WHERE id = ?', [step, user.id]);
  user.totp_last_step = step;
  return true;
}

module.exports = {
  generateSecret,
  codeAt,
  matchStep,
  otpauthUrl,
  verifyForUser,
  base32Decode,
  base32Encode,
};
