const env = require("./env");

// Origins that may call the API from a browser. The frontend's own URL
// (APP_URL) is always allowed; add more with CORS_ORIGINS="https://a.com,https://b.com".
const DEFAULT_ORIGINS = [
  "https://milaan.in",
  "https://www.milaan.in",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
];

function toOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const allowedOrigins = new Set(
  [
    ...DEFAULT_ORIGINS,
    env.appUrl,
    ...String(process.env.CORS_ORIGINS || "").split(","),
  ]
    .map((value) => toOrigin(String(value).trim()))
    .filter(Boolean),
);

// Requests without an Origin header (the native app, curl, server-to-server
// webhooks) are not browser cross-site requests, so they are let through.
function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.has(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (!isAllowedOrigin(origin)) {
      console.warn(`CORS: blocked origin ${origin} (add it to CORS_ORIGINS if it is yours)`);
    }
    callback(null, isAllowedOrigin(origin));
  },
};

// Small set of safe response headers. Written by hand instead of pulling in
// helmet: Cross-Origin-Resource-Policy is "cross-origin" on purpose, because
// the web app shows uploaded photos that are served from this API's origin.
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
}

module.exports = { corsOptions, isAllowedOrigin, securityHeaders };
