const twilio = require("twilio");
const env = require("../config/env");

let client = null;

function getClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env",
    );
  }
  if (!client) {
    client = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return client;
}

async function sendOtpSms(toPhone, code, purpose = "login") {
  // Sirf tab console-fallback use karo jab dev mode ho AUR Twilio SID set na ho
  if (env.nodeEnv !== "production" && !env.twilio.accountSid) {
    console.log(`[DEV SMS] OTP for ${toPhone}: ${code}`);
    return { simulated: true };
  }

  // Twilio configured hai (dev ya production, dono mein) — real SMS bhejo
  try {
    const result = await getClient().messages.create({
      to: toPhone,
      from: env.twilio.fromNumber,
      body:
        purpose === "password_reset"
          ? `${code} is your ApnaJod password reset code. It expires in ${env.otp.expiresMinutes} minutes. Do not share it with anyone.`
          : `${code} is your ApnaJod verification code. It expires in ${env.otp.expiresMinutes} minutes. Do not share it with anyone.`,
    });
    console.log(`[SMS SENT] to ${toPhone}, SID: ${result.sid}`);
    return { sid: result.sid };
  } catch (error) {
    console.error("[SMS ERROR]", error.message);
    throw new Error("Could not send OTP via SMS. Please try again.");
  }
}

module.exports = { sendOtpSms };
