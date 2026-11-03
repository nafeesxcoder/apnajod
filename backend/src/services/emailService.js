const { Resend } = require("resend");
const env = require("../config/env");

let resend = null;
function getClient() {
  if (!env.resend.apiKey) {
    throw new Error("Resend is not configured. Set RESEND_API_KEY in .env");
  }
  if (!resend) {
    resend = new Resend(env.resend.apiKey);
  }
  return resend;
}

async function sendOtpEmail(toEmail, code) {
  // Sirf tab console-fallback use karo jab dev mode ho AUR API key set na ho
  if (env.nodeEnv !== "production" && !env.resend.apiKey) {
    console.log(`[DEV EMAIL] OTP for ${toEmail}: ${code}`);
    return { simulated: true };
  }

  // API key set hai (dev ya production, dono mein) — real email bhejo
  const { data, error } = await getClient().emails.send({
    from: env.resend.fromEmail,
    to: toEmail,
    subject: "Your Milaan verification code",
    html: `
      <div style="font-family: sans-serif; padding: 24px;">
        <h2 style="color:#B30C3D;">Milaan</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p>This code expires in ${env.otp.expiresMinutes} minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message || "Failed to send email");
  return data;
}

module.exports = { sendOtpEmail };
