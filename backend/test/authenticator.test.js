/**
 * Authenticator app codes for the admin's sign-in: the codes must match the
 * standard, a code works once, and the admin routes and OTP sign-in both
 * ask for the second step.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

// Field encryption needs a key; the test uses a throwaway one.
process.env.APP_ENC_KEY = require("node:crypto").randomBytes(32).toString("base64");
const fc = require("../src/services/fieldCrypto");

const totp = require("../src/services/totpService");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

// RFC 4226 HOTP test values, secret "12345678901234567890".
const SECRET = totp.base32Encode(Buffer.from("12345678901234567890"));

test("codes match the RFC 4226 test values", () => {
  assert.equal(SECRET, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.equal(totp.codeAt(SECRET, 0), "755224");
  assert.equal(totp.codeAt(SECRET, 1), "287082");
  assert.equal(totp.codeAt(SECRET, 2), "359152");
});

test("a code from this 30-second step, or one step either side, is accepted", () => {
  const now = 1_000_000_000_000;
  const step = Math.floor(now / 1000 / 30);
  assert.equal(totp.matchStep(SECRET, totp.codeAt(SECRET, step), now), step);
  assert.equal(totp.matchStep(SECRET, totp.codeAt(SECRET, step - 1), now), step - 1);
  assert.equal(totp.matchStep(SECRET, totp.codeAt(SECRET, step + 1), now), step + 1);
  assert.equal(totp.matchStep(SECRET, totp.codeAt(SECRET, step + 5), now), -1);
  assert.equal(totp.matchStep(SECRET, "12ab56", now), -1);
  assert.equal(totp.matchStep(SECRET, "", now), -1);
});

test("a code cannot be used twice", async () => {
  const now = Date.now();
  const step = Math.floor(now / 1000 / 30);
  const user = { id: "u1", totp_secret: null, totp_last_step: null };
  // Store the secret the way the app does: encrypted.
  user.totp_secret = fc.encrypt(SECRET);
  const writes = [];
  const query = async (sql, params) => {
    writes.push(params);
    return [];
  };
  const code = totp.codeAt(SECRET, step);
  assert.equal(await totp.verifyForUser(query, user, code), true);
  assert.equal(user.totp_last_step, step);
  assert.equal(await totp.verifyForUser(query, user, code), false, "same code again must fail");
});

test("two-step verification also applies to OTP sign-in", () => {
  const auth = read("src/controllers/authController.js");
  const verifyOtp = auth.slice(auth.indexOf("const verifyOtp = asyncHandler"), auth.indexOf("// Username + password sign-up"));
  assert.match(verifyOtp, /if \(Number\(user\.two_factor_enabled\) === 1\)[\s\S]*twoFactorRequired: true/);
});

test("the admin authenticator routes sit behind the admin gate", () => {
  const routes = read("src/routes/adminRoutes.js");
  const gate = routes.indexOf("router.use(requireAdmin);");
  assert.ok(gate > 0);
  for (const line of [
    'router.get("/2fa", adminController.authenticatorStatus);',
    'router.post("/2fa/setup", adminController.startAuthenticatorSetup);',
    'router.post("/2fa/confirm", adminController.confirmAuthenticatorSetup);',
    'router.post("/2fa/disable", adminController.disableAuthenticator);',
  ]) {
    assert.ok(routes.indexOf(line) > gate, `${line} must come after the admin gate`);
  }
});

test("the authenticator secret is stored encrypted, never in plain text", () => {
  const service = read("src/services/twoFactorService.js");
  assert.match(service, /UPDATE users SET totp_pending = \? WHERE id = \?", \[fc\.encrypt\(secret\)/);
});
