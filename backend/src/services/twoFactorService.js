const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { codeTargetFor } = require("./codeTarget");
const { query } = require("../config/db");
const otpService = require("./otpService");
const userService = require("./userService");
const totpService = require("./totpService");
const fc = require("./fieldCrypto");
const QRCode = require("qrcode");
const { ApiError } = require("../middleware/errorHandler");

/**
 * Two-step verification (opt-in). A password sign-in with it on gets a short
 * challenge token instead of a session, and a 6-digit code to the verified
 * mobile finishes the sign-in. The code lives in the OTP table under its own
 * purpose, so a login code and a two-step code cannot stand in for each other.
 */
const PURPOSE = "two_factor";
const CHALLENGE_SECRET = () => `${env.jwt.accessSecret}:two-factor`;
const CHALLENGE_MINUTES = 5;
const EXPIRED = "This sign-in expired. Log in again.";

function signChallenge(userId) {
  return jwt.sign({ sub: userId, purpose: PURPOSE }, CHALLENGE_SECRET(), {
    expiresIn: `${CHALLENGE_MINUTES}m`,
  });
}

async function userForChallenge(token) {
  let payload;
  try {
    payload = jwt.verify(String(token || ""), CHALLENGE_SECRET());
  } catch {
    throw new ApiError(401, EXPIRED);
  }
  if (payload.purpose !== PURPOSE) throw new ApiError(401, EXPIRED);
  const user = await userService.findUserById(payload.sub);
  if (!user || Number(user.two_factor_enabled) !== 1) throw new ApiError(401, EXPIRED);
  return user;
}

function maskPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 4 ? `••••• ${digits.slice(-4)}` : "";
}

/** Admins with an authenticator app use its code, not an SMS. */
function usesAuthenticator(user) {
  return !!user.totp_secret;
}

async function sendCode(user) {
  if (usesAuthenticator(user)) return;
  const target = codeTargetFor(user);
  if (!target) {
    throw new ApiError(409, "Add a mobile number or an email before turning this on.");
  }
  await otpService.requestOtp({ channel: target.channel, identifier: target.identifier, purpose: PURPOSE });
}

async function checkCode(user, code) {
  if (usesAuthenticator(user)) {
    if (!(await totpService.verifyForUser(query, user, code))) {
      throw new ApiError(400, "That code is wrong or has already been used. Check your authenticator app.");
    }
    return;
  }
  const target = codeTargetFor(user);
  if (!target) throw new ApiError(409, "Add a mobile number or an email before turning this on.");
  await otpService.verifyOtp({
    channel: target.channel,
    identifier: target.identifier,
    code: String(code),
    purpose: PURPOSE,
  });
}

async function setEnabled(userId, enabled) {
  await query("UPDATE users SET two_factor_enabled = ? WHERE id = ?", [enabled ? 1 : 0, userId]);
}

/** Admin: is the authenticator app on for this account. */
async function authenticatorStatus(userId) {
  const user = await userService.findUserById(userId);
  return { enabled: usesAuthenticator(user) };
}

/** Admin: a new secret and its QR code. Nothing is on until the first code checks out. */
async function startAuthenticatorSetup(userId) {
  const user = await userService.findUserById(userId);
  if (usesAuthenticator(user)) {
    throw new ApiError(409, "The authenticator app is already on. Turn it off first to set it up again.");
  }
  const secret = totpService.generateSecret();
  await query("UPDATE users SET totp_pending = ? WHERE id = ?", [fc.encrypt(secret), userId]);
  const qrDataUrl = await QRCode.toDataURL(totpService.otpauthUrl(user.username || "admin", secret), {
    margin: 1,
    width: 220,
  });
  return { secret, qrDataUrl };
}

async function confirmAuthenticatorSetup(userId, code) {
  const user = await userService.findUserById(userId);
  const pending = fc.decrypt(user.totp_pending);
  if (!pending) throw new ApiError(400, "Start the setup again to get a new QR code.");
  const step = totpService.matchStep(pending, code);
  if (step < 0) throw new ApiError(400, "That code is wrong. Check the 6-digit code in your authenticator app.");
  await query(
    "UPDATE users SET totp_secret = totp_pending, totp_pending = NULL, totp_last_step = ?, two_factor_enabled = 1 WHERE id = ?",
    [step, userId],
  );
  return { enabled: true };
}

/** Turning it off needs a current code from the app. */
async function disableAuthenticator(userId, code) {
  const user = await userService.findUserById(userId);
  if (!usesAuthenticator(user)) throw new ApiError(400, "The authenticator app is not on.");
  if (!(await totpService.verifyForUser(query, user, code))) {
    throw new ApiError(400, "That code is wrong or has already been used.");
  }
  await query(
    "UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_last_step = NULL, two_factor_enabled = 0 WHERE id = ?",
    [userId],
  );
  return { enabled: false };
}

module.exports = {
  authenticatorStatus,
  startAuthenticatorSetup,
  confirmAuthenticatorSetup,
  disableAuthenticator,
  signChallenge,
  userForChallenge,
  maskPhone,
  usesAuthenticator,
  sendCode,
  checkCode,
  setEnabled,
};
