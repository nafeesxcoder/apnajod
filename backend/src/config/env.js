require("dotenv").config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: required("APP_URL", "http://localhost:8081"),
  apiUrl: required("API_URL", "http://localhost:4000"),

  db: {
    host: required("DB_HOST", "127.0.0.1"),
    port: Number(process.env.DB_PORT || 3306),
    user: required("DB_USER", "root"),
    password: required("DB_PASSWORD", ""),
    database: required("DB_NAME", "milaan"),
  },

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: required("JWT_ACCESS_EXPIRES_IN", "15m"),
    refreshExpiresIn: required("JWT_REFRESH_EXPIRES_IN", "30d"),
  },

  otp: {
    length: Number(process.env.OTP_LENGTH || 6),
    expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 5),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
    resendCooldownSeconds: Number(
      process.env.OTP_RESEND_COOLDOWN_SECONDS || 45,
    ),
  },

  twilio: {
    accountSid: required("TWILIO_ACCOUNT_SID"),
    authToken: required("TWILIO_AUTH_TOKEN"),
    fromNumber: required("TWILIO_FROM_NUMBER"),
    verifyServiceSid: required("TWILIO_VERIFY_SERVICE_SID"), // <-- YE LINE ADD KI HAI
  },

  resend: {
    apiKey: required("RESEND_API_KEY"),
    fromEmail: required(
      "RESEND_FROM_EMAIL",
      "Milaan <onboarding@milaan.in>",
    ),
  },

  google: {
    clientId: required("GOOGLE_CLIENT_ID"),
    clientSecret: required("GOOGLE_CLIENT_SECRET"),
    redirectUri: required("GOOGLE_REDIRECT_URI"),
  },

  apple: {
    clientId: required("APPLE_CLIENT_ID"),
    teamId: required("APPLE_TEAM_ID"),
    keyId: required("APPLE_KEY_ID"),
    privateKeyPath: required("APPLE_PRIVATE_KEY_PATH"),
    redirectUri: required("APPLE_REDIRECT_URI"),
  },

  linkedin: {
    clientId: required("LINKEDIN_CLIENT_ID"),
    clientSecret: required("LINKEDIN_CLIENT_SECRET"),
    redirectUri: required("LINKEDIN_REDIRECT_URI"),
  },

  push: {
    publicKey: required("VAPID_PUBLIC_KEY", ""),
    privateKey: required("VAPID_PRIVATE_KEY", ""),
    subject: required("VAPID_SUBJECT", "mailto:support@milaan.in"),
  },

};
