const jwt = require('jsonwebtoken');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');

// ---------- Google ----------
const googleClient = new OAuth2Client(
  env.google.clientId,
  env.google.clientSecret,
  env.google.redirectUri,
);

function getGoogleAuthUrl(state) {
  return googleClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
  });
}

async function exchangeGoogleCode(code) {
  const { tokens } = await googleClient.getToken(code);
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.google.clientId,
  });
  const payload = ticket.getPayload();
  return {
    providerUserId: payload.sub,
    email: payload.email,
    fullName: payload.name,
    avatarUrl: payload.picture,
  };
}

// ---------- Apple ----------
function getAppleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: env.apple.clientId,
    redirect_uri: env.apple.redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

function buildAppleClientSecret() {
  const privateKey = fs.readFileSync(env.apple.privateKeyPath, 'utf8');
  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '5m',
    issuer: env.apple.teamId,
    audience: 'https://appleid.apple.com',
    subject: env.apple.clientId,
    keyid: env.apple.keyId,
  });
}

async function exchangeAppleCode(code) {
  const clientSecret = buildAppleClientSecret();
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.apple.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: env.apple.redirectUri,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(400, 'Apple sign-in failed', data);
  }
  const decoded = jwt.decode(data.id_token);
  return {
    providerUserId: decoded.sub,
    email: decoded.email,
    fullName: null, // Apple only sends name on first authorization, via req.body.user on the client
    avatarUrl: null,
  };
}

// ---------- LinkedIn ----------
function getLinkedInAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.linkedin.clientId,
    redirect_uri: env.linkedin.redirectUri,
    scope: 'openid profile email',
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

async function exchangeLinkedInCode(code) {
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.linkedin.redirectUri,
      client_id: env.linkedin.clientId,
      client_secret: env.linkedin.clientSecret,
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new ApiError(400, 'LinkedIn sign-in failed', tokenData);
  }

  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileResponse.json();

  return {
    providerUserId: profile.sub,
    email: profile.email,
    fullName: profile.name,
    avatarUrl: profile.picture,
  };
}

module.exports = {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getAppleAuthUrl,
  exchangeAppleCode,
  getLinkedInAuthUrl,
  exchangeLinkedInCode,
};
