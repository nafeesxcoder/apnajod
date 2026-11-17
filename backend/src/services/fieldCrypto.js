const crypto = require("node:crypto");
const env = require("../config/env");

/**
 * Field-level encryption for personal data stored in MySQL.
 *
 * - encrypt / decrypt: AES-256-GCM with a random 12-byte IV per value.
 *   Stored as "v1:" + base64(iv | tag | ciphertext). decrypt() returns values
 *   without the prefix unchanged, so rows that are not yet back-filled still read.
 * - blindIndex: HMAC-SHA256 of a normalised phone or email. Used for exact
 *   lookups and uniqueness without storing the plain value in an indexed column.
 *
 * Both use subkeys derived from APP_ENC_KEY (32 random bytes, base64), so the
 * raw key is never used directly for two different purposes.
 */

const PREFIX = "v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const BLIND_KINDS = ["phone", "email"];

function masterKey() {
  const key = Buffer.from(env.fieldEncKey || "", "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENC_KEY must be 32 random bytes, base64 encoded");
  }
  return key;
}

function subkey(label) {
  return crypto.createHmac("sha256", masterKey()).update(label).digest();
}

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encrypt(plain) {
  if (plain === null || plain === undefined) return null;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", subkey("field-encryption"), iv);
  const body = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, body]).toString("base64");
}

function decrypt(value) {
  if (value === null || value === undefined) return null;
  if (!isEncrypted(value)) return value; // not back-filled yet
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const body = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv("aes-256-gcm", subkey("field-encryption"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

function normalizePhone(value) {
  if (value === null || value === undefined) return null;
  return String(value).replace(/\s+/g, "");
}

function normalizeEmail(value) {
  if (value === null || value === undefined) return null;
  return String(value).trim().toLowerCase();
}

function blindIndex(kind, value) {
  if (!BLIND_KINDS.includes(kind)) {
    throw new Error(`Unknown blind index kind: ${kind}`);
  }
  if (value === null || value === undefined || value === "") return null;
  const norm = kind === "email" ? normalizeEmail(value) : normalizePhone(value);
  return crypto
    .createHmac("sha256", subkey("blind-index"))
    .update(`${kind}:${norm}`)
    .digest("hex");
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  blindIndex,
  normalizePhone,
  normalizeEmail,
};
