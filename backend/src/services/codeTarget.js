const fc = require("./fieldCrypto");

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where a one-time code goes for an account: its mobile number if it has one,
 * otherwise its email. An account that signed up with an email has no number,
 * so without this its password reset and two-step code would go nowhere.
 */
function codeTargetFor(user) {
  if (!user) return null;
  if (user.phone) return { channel: "phone", identifier: user.phone };
  if (user.email) return { channel: "email", identifier: user.email };
  return null;
}

/** The email as it is stored, or null when what was typed is not an email. */
function normalizeEmailEntry(value) {
  const email = fc.normalizeEmail(String(value ?? "").trim());
  return EMAIL_SHAPE.test(email) ? email : null;
}

module.exports = { codeTargetFor, normalizeEmailEntry };
