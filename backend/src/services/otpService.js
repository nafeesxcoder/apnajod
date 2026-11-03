const crypto = require("crypto");
const { query } = require("../config/db");
const env = require("../config/env");
const {
  generateNumericCode,
  hashCode,
  compareCode,
  normalizeIdentifier,
  isValidPhone,
} = require("../utils/otp");
const { sendOtpSms } = require("./smsService");
const { sendOtpEmail } = require("./emailService");
const { ApiError } = require("../middleware/errorHandler");

async function requestOtp({ channel, identifier, purpose = 'login' }) {
  const normalized = normalizeIdentifier(channel, identifier);
  if (channel === "phone" && !isValidPhone(normalized)) {
    throw new ApiError(
      400,
      "Enter a valid 10-digit Indian mobile number, e.g. 9876543210",
    );
  }

  // Cooldown: block rapid resends for the same identifier
  const recent = await query(
    `SELECT created_at FROM otp_codes
     WHERE identifier = ? AND channel = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [normalized, channel, purpose],
  );
  if (recent[0]) {
    const secondsSince =
      (Date.now() - new Date(recent[0].created_at).getTime()) / 1000;
    if (secondsSince < env.otp.resendCooldownSeconds) {
      throw new ApiError(
        429,
        `Please wait ${Math.ceil(env.otp.resendCooldownSeconds - secondsSince)}s before requesting another code`,
      );
    }
  }

  const code = generateNumericCode();
  const codeHash = await hashCode(code);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

  await query(
    `INSERT INTO otp_codes (id, identifier, channel, code_hash, purpose, max_attempts, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, normalized, channel, codeHash, purpose, env.otp.maxAttempts, expiresAt],
  );

  try {
    if (channel === "phone") {
      await sendOtpSms(normalized, code, purpose);
    } else {
      await sendOtpEmail(normalized, code);
    }
  } catch (err) {
    // Delivery failed: drop the code so the cooldown doesn't lock the user
    // out of retrying, and return a clean error instead of a 500.
    await query("DELETE FROM otp_codes WHERE id = ?", [id]);
    // Twilio 21211 / 21614 = invalid / non-mobile destination number
    if (err && (err.code === 21211 || err.code === 21614)) {
      throw new ApiError(
        400,
        "That mobile number looks invalid. Enter a 10-digit Indian mobile number, e.g. 9876543210",
      );
    }
    console.error("OTP delivery failed:", err && (err.message || err));
    throw new ApiError(502, "Could not send the code right now. Please try again.");
  }

  return {
    identifier: normalized,
    expiresInSeconds: env.otp.expiresMinutes * 60,
  };
}

async function verifyOtp({ channel, identifier, code, purpose = 'login' }) {
  const normalized = normalizeIdentifier(channel, identifier);

  // Phone aur email dono ke liye database se hi check karo
  // (kyunki OTP humesha yahin generate/save hota hai, chahe SMS ho ya email)
  const rows = await query(
    `SELECT * FROM otp_codes
     WHERE identifier = ? AND channel = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [normalized, channel, purpose],
  );
  const record = rows[0];

  if (!record) {
    throw new ApiError(400, "No active code found. Please request a new one.");
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new ApiError(400, "This code has expired. Please request a new one.");
  }
  if (record.attempts >= record.max_attempts) {
    throw new ApiError(
      429,
      "Too many incorrect attempts. Please request a new code.",
    );
  }

  const isMatch = await compareCode(code, record.code_hash);
  if (!isMatch) {
    await query("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?", [
      record.id,
    ]);
    throw new ApiError(400, "Incorrect code. Please try again.");
  }

  await query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?", [
    record.id,
  ]);

  return { identifier: normalized };
}

module.exports = { requestOtp, verifyOtp };
