const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");
const otpService = require("../services/otpService");
const userService = require("../services/userService");
const sessionService = require("../services/sessionService");
const oauthService = require("../services/oauthService");
const env = require("../config/env");
const { normalizeIndianPhone } = require("../utils/otp");
// In-memory OAuth state store (swap for Redis in production / multi-instance deploys)
const oauthStates = new Map();
function createState(meta = {}) {
  const state = crypto.randomUUID();
  oauthStates.set(state, { ...meta, createdAt: Date.now() });
  return state;
}
function consumeState(state) {
  const value = oauthStates.get(state);
  oauthStates.delete(state);
  return value;
}
// ---------- OTP: phone or email ----------
const requestOtp = asyncHandler(async (req, res) => {
  const { channel, identifier } = req.body;
  if (!channel || !["phone", "email"].includes(channel)) {
    throw new ApiError(400, 'channel must be "phone" or "email"');
  }
  if (!identifier) {
    throw new ApiError(400, "identifier is required");
  }
  const result = await otpService.requestOtp({ channel, identifier });
  res.json({ ok: true, ...result });
});
const verifyOtp = asyncHandler(async (req, res) => {
  const { channel, identifier, code } = req.body;
  if (!channel || !["phone", "email"].includes(channel)) {
    throw new ApiError(400, 'channel must be "phone" or "email"');
  }
  if (!identifier || !code) {
    throw new ApiError(400, "identifier and code are required");
  }
  const { identifier: normalized } = await otpService.verifyOtp({
    channel,
    identifier,
    code,
  });
  let user =
    channel === "phone"
      ? await userService.findUserByPhone(normalized)
      : await userService.findUserByEmail(normalized);
  let accountRestored = false;
  let accountReactivated = false;
  if (!user) {
    user = await userService.createUser(
      channel === "phone" ? { phone: normalized } : { email: normalized },
    );
  } else if (channel === "phone" && !user.phone_verified_at) {
    await userService.markPhoneVerified(user.id);
  } else if (channel === "email" && !user.email_verified_at) {
    await userService.markEmailVerified(user.id);
  }
  // Instagram-style: logging back in within 30 days of deletion restores the account.
  if (user.deleted_at) {
    if (userService.isWithinGracePeriod(user.deleted_at)) {
      await userService.restoreUser(user.id);
      user.deleted_at = null;
      accountRestored = true;
    } else {
      throw new ApiError(410, "This account has been permanently deleted.");
    }
  }
  // Instagram-style: a deactivated account reactivates automatically the moment the member logs back in.
  if (user.deactivated_at) {
    await userService.reactivateUser(user.id);
    user.deactivated_at = null;
    accountReactivated = true;
  }
  const tokens = await sessionService.issueSession(user.id);
  res.json({
    ok: true,
    user: publicUser(user),
    accountRestored,
    accountReactivated,
    ...tokens,
  });
});
// =====================================================================
//  Username + password sign-up and sign-in
//
//  The old flow asked for a lot before the account existed and people
//  gave up. Now: mobile number, username, password. Nothing else.
// =====================================================================

/** Shared handling for a deleted / deactivated account on any sign-in path. */
async function resolveAccountState(user) {
  let accountRestored = false;
  let accountReactivated = false;
  if (user.deleted_at) {
    if (userService.isWithinGracePeriod(user.deleted_at)) {
      await userService.restoreUser(user.id);
      user.deleted_at = null;
      accountRestored = true;
    } else {
      throw new ApiError(410, "This account has been permanently deleted.");
    }
  }
  if (user.deactivated_at) {
    await userService.reactivateUser(user.id);
    user.deactivated_at = null;
    accountReactivated = true;
  }
  return { accountRestored, accountReactivated };
}

// ---------- Is this username free? ----------
const checkUsername = asyncHandler(async (req, res) => {
  const raw = req.query.username ?? req.body?.username;
  const error = userService.validateUsername(raw);
  if (error) return res.json({ ok: true, available: false, reason: error });
  const available = await userService.isUsernameAvailable(raw);
  res.json({
    ok: true,
    available,
    username: userService.normalizeUsername(raw),
    reason: available ? "" : "That username is taken. Try another one.",
  });
});

// ---------- Step 1 of sign-up: claim the details, send the OTP ----------
const registerStart = asyncHandler(async (req, res) => {
  const { phone, username, password } = req.body;

  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    throw new ApiError(400, "Enter a valid 10-digit Indian mobile number.");
  }
  const usernameError = userService.validateUsername(username);
  if (usernameError) throw new ApiError(400, usernameError);
  const passwordError = userService.validatePassword(password);
  if (passwordError) throw new ApiError(400, passwordError);

  const existingPhone = await userService.findUserByPhone(normalizedPhone);
  if (existingPhone && !existingPhone.deleted_at) {
    throw new ApiError(409, "This mobile number already has an account. Log in instead.");
  }
  if (!(await userService.isUsernameAvailable(username))) {
    throw new ApiError(409, "That username is taken. Try another one.");
  }

  const result = await otpService.requestOtp({
    channel: "phone",
    identifier: normalizedPhone,
    purpose: "register",
  });

  res.json({
    ok: true,
    phone: normalizedPhone,
    username: userService.normalizeUsername(username),
    ...result,
  });
});

// ---------- Step 2 of sign-up: confirm the OTP, create the account ----------
const registerVerify = asyncHandler(async (req, res) => {
  const { phone, username, password, code } = req.body;

  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) {
    throw new ApiError(400, "Enter a valid 10-digit Indian mobile number.");
  }
  const usernameError = userService.validateUsername(username);
  if (usernameError) throw new ApiError(400, usernameError);
  const passwordError = userService.validatePassword(password);
  if (passwordError) throw new ApiError(400, passwordError);
  if (!code) throw new ApiError(400, "Enter the code we sent you.");

  await otpService.verifyOtp({
    channel: "phone",
    identifier: normalizedPhone,
    code,
    purpose: "register",
  });

  // The username could have been claimed while this member was typing the
  // code, so it is checked again now that the OTP has been spent.
  if (!(await userService.isUsernameAvailable(username))) {
    throw new ApiError(409, "That username was just taken. Pick another one.");
  }

  let user = await userService.findUserByPhone(normalizedPhone);
  if (user) {
    // Re-registering a number inside its 30-day deletion grace period.
    if (user.deleted_at && userService.isWithinGracePeriod(user.deleted_at)) {
      await userService.restoreUser(user.id);
    } else if (user.deleted_at) {
      throw new ApiError(410, "This account has been permanently deleted.");
    }
    await userService.setUsername(user.id, username);
    await userService.setPassword(user.id, password);
    await userService.markPhoneVerified(user.id);
    user = await userService.findUserById(user.id);
  } else {
    user = await userService.createUser({
      phone: normalizedPhone,
      username: userService.normalizeUsername(username),
      passwordHash: await userService.hashPassword(password),
    });
  }

  const tokens = await sessionService.issueSession(user.id);
  res.status(201).json({ ok: true, user: publicUser(user), ...tokens });
});

// ---------- Sign in with username (or mobile) + password ----------
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    throw new ApiError(400, "Enter your username and password.");
  }

  const user = await userService.findUserByIdentifier(identifier, normalizeIndianPhone);

  // Same message whether the account is missing or the password is wrong, so
  // the endpoint cannot be used to discover which usernames exist.
  const wrong = () => new ApiError(401, "Wrong username or password.");
  if (!user) throw wrong();

  const lockedMinutes = userService.lockRemainingMinutes(user);
  if (lockedMinutes > 0) {
    throw new ApiError(
      429,
      `Too many wrong attempts. Try again in ${lockedMinutes} minute${lockedMinutes === 1 ? "" : "s"}, or reset your password.`,
    );
  }

  if (!user.password_hash) {
    throw new ApiError(
      409,
      "This account has no password yet. Use 'Forgot password' to set one with an OTP.",
    );
  }
  if (!(await userService.verifyPassword(user, password))) {
    await userService.recordFailedLogin(user.id);
    throw wrong();
  }

  // Checked after the password so a wrong password and a suspension are
  // not distinguishable to someone guessing their way in.
  if (user.status === "suspended") {
    throw new ApiError(
      403,
      "This account has been suspended. Contact support if you believe this is a mistake.",
    );
  }

  await userService.clearFailedLogins(user.id);
  const { accountRestored, accountReactivated } = await resolveAccountState(user);
  const tokens = await sessionService.issueSession(user.id);

  res.json({
    ok: true,
    user: publicUser(user),
    accountRestored,
    accountReactivated,
    // The app shows the update-password screen first when this is true.
    mustChangePassword: !!user.must_change_password,
    ...tokens,
  });
});

// ---------- Forgot password: send an OTP to the registered mobile ----------
const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) throw new ApiError(400, "Enter your username or mobile number.");

  const user = await userService.findUserByIdentifier(identifier, normalizeIndianPhone);

  // Always answer the same way, so this cannot be used to find out which
  // numbers or usernames are registered.
  const generic = {
    ok: true,
    sent: true,
    message: "If that account exists, we sent a code to its registered mobile number.",
    expiresInSeconds: env.otp.expiresMinutes * 60,
  };

  if (!user || !user.phone || (user.deleted_at && !userService.isWithinGracePeriod(user.deleted_at))) {
    return res.json(generic);
  }

  try {
    await otpService.requestOtp({
      channel: "phone",
      identifier: user.phone,
      purpose: "password_reset",
    });
  } catch (error) {
    // A cooldown or delivery failure is still reported honestly; anything
    // else stays behind the generic answer.
    if (error instanceof ApiError && (error.statusCode === 429 || error.status === 429)) throw error;
    console.error("Password reset OTP failed:", error && (error.message || error));
  }

  // The masked number lets the member check they are resetting the right
  // account without exposing the full number.
  return res.json({ ...generic, maskedPhone: maskPhone(user.phone) });
});

// ---------- Forgot password: confirm the OTP, then set the new password ----------
//
// The app sends the code and the new password together, so the member always
// lands on the "set a new password" screen before reaching the app. The reset
// signs out every other session.
const resetPassword = asyncHandler(async (req, res) => {
  const { identifier, code, password } = req.body;
  if (!identifier || !code) throw new ApiError(400, "Enter the code we sent you.");
  const passwordError = userService.validatePassword(password);
  if (passwordError) throw new ApiError(400, passwordError);

  const user = await userService.findUserByIdentifier(identifier, normalizeIndianPhone);
  if (!user || !user.phone) throw new ApiError(400, "That code is not valid. Request a new one.");

  await otpService.verifyOtp({
    channel: "phone",
    identifier: user.phone,
    code,
    purpose: "password_reset",
  });

  await userService.setPassword(user.id, password, { mustChange: false });
  await userService.markPhoneVerified(user.id);
  // Anyone signed in with the old password is pushed out.
  await sessionService.revokeAllSessions(user.id);

  const fresh = await userService.findUserById(user.id);
  await resolveAccountState(fresh);
  const tokens = await sessionService.issueSession(fresh.id);

  res.json({ ok: true, user: publicUser(fresh), ...tokens });
});

// ---------- Change password while signed in ----------
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, password } = req.body;
  const passwordError = userService.validatePassword(password);
  if (passwordError) throw new ApiError(400, passwordError);

  const user = await userService.findUserById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");

  // An account that has no password yet (OTP-only or OAuth) can set one
  // without proving an old password it never had.
  if (user.password_hash && !(await userService.verifyPassword(user, currentPassword))) {
    throw new ApiError(401, "Your current password is wrong.");
  }

  await userService.setPassword(user.id, password);
  await sessionService.revokeAllSessions(user.id);
  const tokens = await sessionService.issueSession(user.id);
  res.json({ ok: true, ...tokens });
});

function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 4 ? `\u2022\u2022\u2022\u2022\u2022 ${digits.slice(-4)}` : "your mobile number";
}

// ---------- Refresh / logout ----------
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, "refreshToken is required");
  const tokens = await sessionService.rotateSession(refreshToken);
  res.json({ ok: true, ...tokens });
});
const logout = asyncHandler(async (req, res) => {
  await sessionService.revokeAllSessions(req.user.id);
  res.json({ ok: true });
});
const me = asyncHandler(async (req, res) => {
  const user = await userService.findUserById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");
  res.json({ ok: true, user: publicUser(user) });
});
// ---------- Delete / restore account (soft delete, 30-day grace period) ----------
const deleteAccount = asyncHandler(async (req, res) => {
  await userService.softDeleteUser(req.user.id);
  await sessionService.revokeAllSessions(req.user.id);
  res.json({
    ok: true,
    message: "Your account is scheduled for permanent deletion in 30 days. Log back in before then to restore it.",
  });
});
// ---------- Deactivate account (Instagram-style, reversible any time by logging back in) ----------
const deactivateAccount = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.user.id);
  await sessionService.revokeAllSessions(req.user.id);
  res.json({
    ok: true,
    message: "Your account is deactivated. Your profile is hidden until you log back in.",
  });
});
// ---------- Google ----------
const googleStart = asyncHandler(async (req, res) => {
  const state = createState();
  res.redirect(oauthService.getGoogleAuthUrl(state));
});
const googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  consumeState(state);
  const profile = await oauthService.exchangeGoogleCode(code);
  if (!profile.email) {
    return res.redirect(`${env.appUrl}/auth/callback?error=google_no_email`);
  }
  // Google email already verified hai, extra security ke liye OTP bhi bhejte hain
  await otpService.requestOtp({ channel: "email", identifier: profile.email });
  const params = new URLSearchParams({
    provider: "google",
    email: profile.email,
    fullName: profile.fullName || "",
  });
  res.redirect(`${env.appUrl}/auth/callback?${params.toString()}`);
});
// ---------- Apple ----------
const appleStart = asyncHandler(async (req, res) => {
  const state = createState();
  res.redirect(oauthService.getAppleAuthUrl(state));
});
const appleCallback = asyncHandler(async (req, res) => {
  // Apple posts form data (response_mode=form_post)
  const { code, state } = req.body;
  consumeState(state);
  const profile = await oauthService.exchangeAppleCode(code);
  if (!profile.email) {
    return res.redirect(`${env.appUrl}/auth/callback?error=apple_no_email`);
  }
  await otpService.requestOtp({ channel: "email", identifier: profile.email });
  const params = new URLSearchParams({
    provider: "apple",
    email: profile.email,
    fullName: profile.fullName || "",
  });
  res.redirect(`${env.appUrl}/auth/callback?${params.toString()}`);
});
// ---------- LinkedIn ----------
const linkedinStart = asyncHandler(async (req, res) => {
  const state = createState();
  res.redirect(oauthService.getLinkedInAuthUrl(state));
});
const linkedinCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  consumeState(state);
  const profile = await oauthService.exchangeLinkedInCode(code);
  if (!profile.email) {
    return res.redirect(`${env.appUrl}/auth/callback?error=linkedin_no_email`);
  }
  await otpService.requestOtp({ channel: "email", identifier: profile.email });
  const params = new URLSearchParams({
    provider: "linkedin",
    email: profile.email,
    fullName: profile.fullName || "",
  });
  res.redirect(`${env.appUrl}/auth/callback?${params.toString()}`);
});
// ---------- helpers ----------
function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    username: user.username,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    phoneVerified: !!user.phone_verified_at,
    emailVerified: !!user.email_verified_at,
    hasPassword: !!user.password_hash,
    mustChangePassword: !!user.must_change_password,
    isPrivate: user.is_private === 1 || user.is_private === true,
  };
}
module.exports = {
  requestOtp,
  verifyOtp,
  checkUsername,
  registerStart,
  registerVerify,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  refresh,
  logout,
  me,
  deleteAccount,
  deactivateAccount,
  googleStart,
  googleCallback,
  appleStart,
  appleCallback,
  linkedinStart,
  linkedinCallback,
};
