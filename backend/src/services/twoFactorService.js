const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { query } = require("../config/db");
const otpService = require("./otpService");
const userService = require("./userService");
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

async function sendCode(user) {
  if (!user.phone) {
    throw new ApiError(409, "Add and verify a mobile number before turning this on.");
  }
  await otpService.requestOtp({ channel: "phone", identifier: user.phone, purpose: PURPOSE });
}

async function checkCode(user, code) {
  await otpService.verifyOtp({
    channel: "phone",
    identifier: user.phone,
    code: String(code),
    purpose: PURPOSE,
  });
}

async function setEnabled(userId, enabled) {
  await query("UPDATE users SET two_factor_enabled = ? WHERE id = ?", [enabled ? 1 : 0, userId]);
}

module.exports = {
  signChallenge,
  userForChallenge,
  maskPhone,
  sendCode,
  checkCode,
  setEnabled,
};
