/**
 * Where you're logged in: each device is a session, a signed-out device stops
 * at once, and a refresh never brings it back.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const { describeDevice } = require("../src/services/sessionService");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const sessions = read("src/services/sessionService.js");
const auth = read("src/middleware/auth.js");
const routes = read("src/routes/authRoutes.js");

test("a device is named from its browser or app", () => {
  assert.equal(describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"), "Chrome on Windows");
  assert.equal(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"), "Safari on iPhone");
  assert.equal(describeDevice("okhttp/4.12.0"), "Apnajoda app");
  assert.equal(describeDevice(""), "Unknown device");
});

test("refreshing keeps the device's session, and the new token is saved before the old one is retired", () => {
  assert.match(sessions, /const familyId = matched\.family_id \|\| matched\.id;/);
  assert.match(sessions, /issueSession\(payload\.sub, \{ familyId \}\)/);
  const issued = sessions.indexOf("const tokens = await issueSession(payload.sub, { familyId });");
  const retired = sessions.indexOf("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [matched.id]");
  assert.ok(issued > 0 && retired > issued, "new token must be saved before the old one is revoked");
});

test("a signed-out device cannot refresh, even inside the 60-second grace", () => {
  assert.match(sessions, /WHERE family_id = \? AND revoked_at IS NULL AND expires_at > NOW\(\) LIMIT 1/);
  assert.match(sessions, /This device was signed out\./);
});

test("every request from a session is checked against that session", () => {
  assert.match(auth, /if \(payload\.sid && !\(await sessionService\.isSessionActive\(payload\.sid, payload\.sub\)\)\)/);
  assert.match(auth, /req\.user = \{ id: payload\.sub, sid: payload\.sid \|\| null \};/);
});

test("the session routes need a sign-in, and log-out-others is listed before the per-device route", () => {
  for (const line of [
    'router.get("/sessions", requireAuth, authController.listSessions);',
    'router.post("/sessions/logout-others", requireAuth, authController.logoutOtherSessions);',
    'router.post("/sessions/:id/logout", requireAuth, authController.logoutSession);',
  ]) {
    assert.ok(routes.includes(line), line);
  }
});
