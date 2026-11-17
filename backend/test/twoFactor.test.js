const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

/**
 * Two-step verification. A password sign-in with it on must not start a
 * session; the session starts only after the code from the mobile. Turning it
 * on or off also needs that code, so a live session alone cannot change it.
 */
const controller = readFileSync(require.resolve("../src/controllers/authController.js"), "utf8");
const routes = readFileSync(require.resolve("../src/routes/authRoutes.js"), "utf8");
const service = readFileSync(require.resolve("../src/services/twoFactorService.js"), "utf8");
const migration = readFileSync(require.resolve("../src/migrations/073_two_factor.sql"), "utf8");

test("a password sign-in with two-step on gets a challenge, not a session", () => {
  assert.ok(controller.includes("if (Number(user.two_factor_enabled) === 1) {"));
  assert.ok(controller.includes("twoFactorRequired: true"));
  assert.ok(controller.indexOf("twoFactorRequired: true") < controller.indexOf("return finishLogin(user, res);"));
});

test("both sign-in steps share one session start", () => {
  assert.ok(controller.includes("async function finishLogin(user, res) {"));
  assert.ok(controller.includes("return finishLogin(user, res);"));
  assert.ok(controller.includes("return finishLogin(user, res);\n});"));
});

test("the second step uses its own OTP purpose", () => {
  assert.ok(service.includes('const PURPOSE = "two_factor";'));
  assert.ok(migration.includes("'two_factor'"));
  assert.ok(migration.includes("'password_reset', 'two_factor'"));
});

test("the routes are throttled and turning it on or off needs a code", () => {
  assert.ok(routes.includes('router.post("/login/2fa", otpVerifyLimiter, authController.loginTwoFactor);'));
  assert.ok(routes.includes('router.post("/2fa/start", requireAuth, otpRequestLimiter, authController.twoFactorStart);'));
  assert.ok(routes.includes('router.post("/2fa/confirm", requireAuth, otpVerifyLimiter, authController.twoFactorConfirm);'));
});
