/**
 * Auth flow tests: sign-up, sign-in, forgot/reset password.
 *
 * There is no MySQL in the test environment, so `config/db` is replaced with a
 * tiny in-memory engine that understands only the handful of statements the
 * auth code issues. It is deliberately dumb — it matches on the SQL text — but
 * it exercises the real controllers, services, validation, bcrypt hashing,
 * OTP purpose separation and the lockout logic over real HTTP.
 */
const assert = require("node:assert/strict");
const { test, before, beforeEach } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-value";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-value";
process.env.OTP_RESEND_COOLDOWN_SECONDS = "0";
delete process.env.TWILIO_ACCOUNT_SID;

// ---------------------------------------------------------------- fake db ---

const db = { users: [], otps: [], refreshTokens: [] };
const sentSms = [];

const norm = (sql) => sql.replace(/\s+/g, " ").trim();

async function query(sql, params = []) {
  const q = norm(sql);

  // ---- users: reads ----
  if (q.startsWith("SELECT * FROM users WHERE phone =")) {
    return db.users.filter((u) => u.phone === params[0]).slice(0, 1);
  }
  if (q.startsWith("SELECT * FROM users WHERE email =")) {
    return db.users.filter((u) => u.email === params[0]).slice(0, 1);
  }
  if (q.startsWith("SELECT * FROM users WHERE username =")) {
    return db.users.filter((u) => u.username === params[0]).slice(0, 1);
  }
  if (q.startsWith("SELECT * FROM users WHERE id =")) {
    return db.users.filter((u) => u.id === params[0]).slice(0, 1);
  }

  // ---- users: writes ----
  if (q.startsWith("INSERT INTO users")) {
    const [id, phone, email, username, passwordHash, fullName, avatarUrl] = params;
    db.users.push({
      id,
      phone,
      email,
      username,
      password_hash: passwordHash,
      full_name: fullName,
      avatar_url: avatarUrl,
      phone_verified_at: /phone_verified_at.*NOW\(\)/.test(q) || q.includes("NOW(), NULL") ? new Date() : null,
      email_verified_at: null,
      must_change_password: 0,
      password_changed_at: passwordHash ? new Date() : null,
      failed_login_count: 0,
      locked_until: null,
      deleted_at: null,
      deactivated_at: null,
      status: "active",
    });
    return { affectedRows: 1 };
  }
  if (q.includes("UPDATE users SET password_hash = ?")) {
    const [hash, mustChange, id] = params;
    const user = db.users.find((u) => u.id === id);
    Object.assign(user, {
      password_hash: hash,
      password_changed_at: new Date(),
      must_change_password: mustChange,
      failed_login_count: 0,
      locked_until: null,
    });
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE users SET username =")) {
    const user = db.users.find((u) => u.id === params[1]);
    user.username = params[0];
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE users SET phone_verified_at = NOW()")) {
    const user = db.users.find((u) => u.id === params[0]);
    user.phone_verified_at = new Date();
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE users SET failed_login_count = failed_login_count + 1")) {
    const [maxFailed, lockMinutes, id] = params;
    const user = db.users.find((u) => u.id === id);
    user.failed_login_count += 1;
    if (user.failed_login_count >= maxFailed) {
      user.locked_until = new Date(Date.now() + lockMinutes * 60000);
    }
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE users SET failed_login_count = 0, locked_until = NULL")) {
    const user = db.users.find((u) => u.id === params[0]);
    if (user) {
      user.failed_login_count = 0;
      user.locked_until = null;
    }
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE users SET deleted_at = NULL")) {
    const user = db.users.find((u) => u.id === params[0]);
    user.deleted_at = null;
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE users SET deactivated_at = NULL")) {
    const user = db.users.find((u) => u.id === params[0]);
    user.deactivated_at = null;
    return { affectedRows: 1 };
  }

  // ---- otp codes ----
  if (q.startsWith("SELECT created_at FROM otp_codes")) {
    const [identifier, channel, purpose] = params;
    return db.otps
      .filter((o) => o.identifier === identifier && o.channel === channel && o.purpose === purpose && !o.consumed_at)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 1);
  }
  if (q.startsWith("INSERT INTO otp_codes")) {
    const [id, identifier, channel, codeHash, purpose, maxAttempts, expiresAt] = params;
    db.otps.push({
      id,
      identifier,
      channel,
      code_hash: codeHash,
      purpose,
      attempts: 0,
      max_attempts: maxAttempts,
      expires_at: expiresAt,
      consumed_at: null,
      created_at: new Date(),
    });
    return { affectedRows: 1 };
  }
  if (q.startsWith("SELECT * FROM otp_codes")) {
    const [identifier, channel, purpose] = params;
    return db.otps
      .filter((o) => o.identifier === identifier && o.channel === channel && o.purpose === purpose && !o.consumed_at)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 1);
  }
  if (q.startsWith("UPDATE otp_codes SET attempts = attempts + 1")) {
    const otp = db.otps.find((o) => o.id === params[0]);
    otp.attempts += 1;
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE otp_codes SET consumed_at = NOW()")) {
    const otp = db.otps.find((o) => o.id === params[0]);
    otp.consumed_at = new Date();
    return { affectedRows: 1 };
  }
  if (q.startsWith("DELETE FROM otp_codes WHERE id =")) {
    db.otps = db.otps.filter((o) => o.id !== params[0]);
    return { affectedRows: 1 };
  }

  // ---- refresh tokens ----
  if (q.startsWith("INSERT INTO refresh_tokens")) {
    const [id, userId, tokenHash, expiresAt] = params;
    db.refreshTokens.push({ id, user_id: userId, token_hash: tokenHash, expires_at: expiresAt, revoked_at: null });
    return { affectedRows: 1 };
  }
  if (q.startsWith("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id =")) {
    db.refreshTokens.forEach((t) => {
      if (t.user_id === params[0] && !t.revoked_at) t.revoked_at = new Date();
    });
    return { affectedRows: 1 };
  }

  throw new Error(`fake db: unhandled statement\n${q}`);
}

// Inject the fake before anything requires the real one.
const dbPath = require.resolve("../src/config/db");
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query, pool: {} } };

// Capture OTP codes instead of sending SMS.
const smsPath = require.resolve("../src/services/smsService");
require.cache[smsPath] = {
  id: smsPath,
  filename: smsPath,
  loaded: true,
  exports: {
    sendOtpSms: async (toPhone, code, purpose) => {
      sentSms.push({ toPhone, code, purpose });
      return { simulated: true };
    },
  },
};

const app = require("../src/app");

// ------------------------------------------------------------- http helper ---

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  // `after` is not used: node:test tears the process down once tests finish,
  // and keeping the handle open would hold it alive.
  server.unref();
});

beforeEach(() => {
  db.users.length = 0;
  db.otps.length = 0;
  db.refreshTokens.length = 0;
  sentSms.length = 0;
});

async function call(method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const lastCode = (purpose) => [...sentSms].reverse().find((m) => m.purpose === purpose)?.code;

/** Signs up a member and returns their credentials. */
async function signUp({ phone = "9876543210", username = "riya_07", password = "milaan123" } = {}) {
  const start = await call("POST", "/auth/register", { phone, username, password });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const verify = await call("POST", "/auth/register/verify", {
    phone,
    username,
    password,
    code: lastCode("register"),
  });
  assert.equal(verify.status, 201, JSON.stringify(verify.body));
  return { phone, username, password, ...verify.body };
}

// ------------------------------------------------------------------- tests ---

test("sign-up needs only a mobile number, a username and a password", async () => {
  const result = await signUp();

  assert.equal(result.user.username, "riya_07");
  assert.equal(result.user.phone, "+919876543210");
  assert.equal(result.user.phoneVerified, true);
  assert.equal(result.user.hasPassword, true);
  assert.ok(result.accessToken);
  assert.ok(result.refreshToken);
  // No name, age, gender, city, religion or photo were required.
  assert.equal(result.user.fullName, null);
});

test("sign-up normalizes however the member types their number", async () => {
  for (const typed of ["09876543210", "+91 98765 43210", "0091 9876543210", "98765 43210"]) {
    db.users.length = 0;
    db.otps.length = 0;
    sentSms.length = 0;
    const start = await call("POST", "/auth/register", { phone: typed, username: "riya_07", password: "milaan123" });
    assert.equal(start.body.phone, "+919876543210", `failed for ${typed}`);
  }
});

test("sign-up rejects numbers that are not Indian mobiles", async () => {
  for (const bad of ["1234567890", "98765", "+14155550199", "987654321"]) {
    const result = await call("POST", "/auth/register", { phone: bad, username: "riya_07", password: "milaan123" });
    assert.equal(result.status, 400, `accepted ${bad}`);
    assert.match(result.body.error, /10-digit Indian mobile/);
  }
});

test("sign-up explains a bad username or a short password instead of just failing", async () => {
  const shortName = await call("POST", "/auth/register", { phone: "9876543210", username: "ab", password: "milaan123" });
  assert.equal(shortName.status, 400);
  assert.equal(shortName.body.error, "Use at least 3 characters.");

  const badStart = await call("POST", "/auth/register", { phone: "9876543210", username: "_riya", password: "milaan123" });
  assert.equal(badStart.body.error, "Start with a letter or a number.");

  const spaced = await call("POST", "/auth/register", { phone: "9876543210", username: "riya patel", password: "milaan123" });
  assert.equal(spaced.body.error, "Use only letters, numbers, dots and underscores.");

  const shortPassword = await call("POST", "/auth/register", { phone: "9876543210", username: "riya_07", password: "12345" });
  assert.equal(shortPassword.body.error, "Use at least 6 characters.");

  // Six characters is enough — no uppercase or digit rule.
  const ok = await call("POST", "/auth/register", { phone: "9876543210", username: "riya_07", password: "milaan" });
  assert.equal(ok.status, 200);
});

test("a taken username or mobile number is reported clearly", async () => {
  await signUp();

  const sameName = await call("POST", "/auth/register", { phone: "9123456780", username: "RIYA_07", password: "milaan123" });
  assert.equal(sameName.status, 409);
  assert.match(sameName.body.error, /username is taken/);

  const samePhone = await call("POST", "/auth/register", { phone: "9876543210", username: "other_name", password: "milaan123" });
  assert.equal(samePhone.status, 409);
  assert.match(samePhone.body.error, /already has an account/);
});

test("username availability can be checked before submitting", async () => {
  const free = await call("GET", "/auth/username/available?username=riya_07");
  assert.equal(free.body.available, true);

  await signUp();

  const taken = await call("GET", "/auth/username/available?username=Riya_07");
  assert.equal(taken.body.available, false);
  assert.match(taken.body.reason, /taken/);

  const invalid = await call("GET", "/auth/username/available?username=ab");
  assert.equal(invalid.body.available, false);
  assert.equal(invalid.body.reason, "Use at least 3 characters.");
});

test("the wrong sign-up code does not create an account", async () => {
  await call("POST", "/auth/register", { phone: "9876543210", username: "riya_07", password: "milaan123" });
  const bad = await call("POST", "/auth/register/verify", {
    phone: "9876543210",
    username: "riya_07",
    password: "milaan123",
    code: "000000",
  });

  assert.equal(bad.status, 400);
  assert.equal(db.users.length, 0);
});

test("sign-in works with the username or the mobile number", async () => {
  await signUp();

  const byUsername = await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });
  assert.equal(byUsername.status, 200);
  assert.ok(byUsername.body.accessToken);

  const byUppercaseUsername = await call("POST", "/auth/login", { identifier: "Riya_07", password: "milaan123" });
  assert.equal(byUppercaseUsername.status, 200);

  const byPhone = await call("POST", "/auth/login", { identifier: "9876543210", password: "milaan123" });
  assert.equal(byPhone.status, 200);

  const byFormattedPhone = await call("POST", "/auth/login", { identifier: "+91 98765 43210", password: "milaan123" });
  assert.equal(byFormattedPhone.status, 200);
});

test("a wrong password and an unknown account give the same answer", async () => {
  await signUp();

  const wrongPassword = await call("POST", "/auth/login", { identifier: "riya_07", password: "wrongpass" });
  const unknownUser = await call("POST", "/auth/login", { identifier: "nobody_here", password: "milaan123" });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.body.error, unknownUser.body.error);
});

test("repeated wrong passwords lock the account for a while", async () => {
  await signUp();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await call("POST", "/auth/login", { identifier: "riya_07", password: "wrongpass" });
    assert.equal(response.status, 401);
  }

  const locked = await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });
  assert.equal(locked.status, 429);
  assert.match(locked.body.error, /Try again in \d+ minute/);
});

test("a successful sign-in clears earlier failures", async () => {
  await signUp();
  await call("POST", "/auth/login", { identifier: "riya_07", password: "wrongpass" });
  await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });

  assert.equal(db.users[0].failed_login_count, 0);
});

test("forgot password sends a code to the registered mobile and masks it", async () => {
  await signUp();

  const asked = await call("POST", "/auth/password/forgot", { identifier: "riya_07" });
  assert.equal(asked.status, 200);
  assert.equal(asked.body.sent, true);
  assert.equal(asked.body.maskedPhone, "••••• 3210");
  assert.equal(lastCode("password_reset").length, 6);
});

test("forgot password does not reveal whether an account exists", async () => {
  const unknown = await call("POST", "/auth/password/forgot", { identifier: "nobody_here" });

  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.sent, true);
  assert.equal(unknown.body.maskedPhone, undefined);
  assert.equal(sentSms.length, 0);
});

test("the reset code sets a new password and signs the member in", async () => {
  await signUp();
  await call("POST", "/auth/password/forgot", { identifier: "riya_07" });

  const reset = await call("POST", "/auth/password/reset", {
    identifier: "riya_07",
    code: lastCode("password_reset"),
    password: "nayapass1",
  });

  assert.equal(reset.status, 200);
  assert.ok(reset.body.accessToken, "reset returns a session so the member lands in the app");

  const withNew = await call("POST", "/auth/login", { identifier: "riya_07", password: "nayapass1" });
  assert.equal(withNew.status, 200);

  const withOld = await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });
  assert.equal(withOld.status, 401, "the old password stops working");
});

test("a reset refuses a short new password, so nothing changes", async () => {
  await signUp();
  await call("POST", "/auth/password/forgot", { identifier: "riya_07" });

  const reset = await call("POST", "/auth/password/reset", {
    identifier: "riya_07",
    code: lastCode("password_reset"),
    password: "123",
  });

  assert.equal(reset.status, 400);
  assert.equal(reset.body.error, "Use at least 6 characters.");

  const stillOld = await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });
  assert.equal(stillOld.status, 200);
});

test("a reset code cannot be replayed", async () => {
  await signUp();
  await call("POST", "/auth/password/forgot", { identifier: "riya_07" });
  const code = lastCode("password_reset");

  await call("POST", "/auth/password/reset", { identifier: "riya_07", code, password: "nayapass1" });
  const replay = await call("POST", "/auth/password/reset", { identifier: "riya_07", code, password: "hackpass1" });

  assert.equal(replay.status, 400);
  const stillNew = await call("POST", "/auth/login", { identifier: "riya_07", password: "nayapass1" });
  assert.equal(stillNew.status, 200);
});

test("a sign-up code cannot be used as a password reset code", async () => {
  await call("POST", "/auth/register", { phone: "9876543210", username: "riya_07", password: "milaan123" });
  const registerCode = lastCode("register");

  await call("POST", "/auth/register/verify", {
    phone: "9876543210",
    username: "riya_07",
    password: "milaan123",
    code: registerCode,
  });

  const crossUse = await call("POST", "/auth/password/reset", {
    identifier: "riya_07",
    code: registerCode,
    password: "hackpass1",
  });

  assert.equal(crossUse.status, 400);
});

test("a reset signs out sessions created with the old password", async () => {
  const signedUp = await signUp();
  const oldToken = signedUp.accessToken;

  const before = await fetch(`${baseUrl}/auth/me`, { headers: { authorization: `Bearer ${oldToken}` } });
  assert.equal(before.status, 200);

  await call("POST", "/auth/password/forgot", { identifier: "riya_07" });
  await call("POST", "/auth/password/reset", {
    identifier: "riya_07",
    code: lastCode("password_reset"),
    password: "nayapass1",
  });

  const revoked = db.refreshTokens.filter((t) => t.revoked_at !== null);
  assert.equal(revoked.length, 1, "the pre-reset refresh token is revoked");
});

test("a signed-in member can change their password with the current one", async () => {
  const signedUp = await signUp();

  const wrongCurrent = await fetch(`${baseUrl}/auth/password/change`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${signedUp.accessToken}` },
    body: JSON.stringify({ currentPassword: "wrongpass", password: "nayapass1" }),
  });
  assert.equal(wrongCurrent.status, 401);

  const changed = await fetch(`${baseUrl}/auth/password/change`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${signedUp.accessToken}` },
    body: JSON.stringify({ currentPassword: "milaan123", password: "nayapass1" }),
  });
  assert.equal(changed.status, 200);

  const withNew = await call("POST", "/auth/login", { identifier: "riya_07", password: "nayapass1" });
  assert.equal(withNew.status, 200);
});

test("signing in restores an account deleted inside its grace period", async () => {
  await signUp();
  db.users[0].deleted_at = new Date(Date.now() - 3 * 86400000);

  const result = await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });

  assert.equal(result.status, 200);
  assert.equal(result.body.accountRestored, true);
  assert.equal(db.users[0].deleted_at, null);
});

test("signing in reactivates a deactivated account", async () => {
  await signUp();
  db.users[0].deactivated_at = new Date();

  const result = await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });

  assert.equal(result.status, 200);
  assert.equal(result.body.accountReactivated, true);
  assert.equal(db.users[0].deactivated_at, null);
});

test("an account past its grace period cannot be signed into", async () => {
  await signUp();
  db.users[0].deleted_at = new Date(Date.now() - 60 * 86400000);

  const result = await call("POST", "/auth/login", { identifier: "riya_07", password: "milaan123" });

  assert.equal(result.status, 410);
});

test("the password is never stored or returned in plain text", async () => {
  await call("POST", "/auth/register", { phone: "9876543210", username: "riya_07", password: "milaan123" });
  const result = await call("POST", "/auth/register/verify", {
    phone: "9876543210",
    username: "riya_07",
    password: "milaan123",
    code: lastCode("register"),
  });

  assert.equal(JSON.stringify(result.body).includes("milaan123"), false);
  assert.notEqual(db.users[0].password_hash, "milaan123");
  assert.match(db.users[0].password_hash, /^\$2[aby]\$/, "stored as a bcrypt hash");
});

test("the migration adds every column the auth code writes to", async () => {
  const fs = require("node:fs");
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "src", "migrations", "021_username_password.sql"),
    "utf8",
  );

  for (const column of [
    "username",
    "password_hash",
    "must_change_password",
    "password_changed_at",
    "failed_login_count",
    "locked_until",
  ]) {
    assert.ok(sql.includes(column), `migration is missing ${column}`);
  }
  assert.match(sql, /password_reset/, "the otp purpose enum must allow password_reset");
  assert.match(sql, /register/, "the otp purpose enum must allow register");
});
