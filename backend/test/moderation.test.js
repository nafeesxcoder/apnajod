/**
 * What a report and a suspension actually do.
 *
 * Both were decoration before: reporting wrote a row nothing read, and
 * users.status had a 'suspended' value that no code path checked, so an
 * account could be suspended and carry on as normal.
 *
 * The database is stubbed rather than reached for: what is being tested is
 * that the checks happen at all and that suspending ends the session, which
 * is logic, not SQL.
 */
const assert = require("node:assert/strict");
const { test, beforeEach, after } = require("node:test");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

const dbPath = require.resolve("../src/config/db");
const authPath = require.resolve("../src/middleware/auth");
const sessionPath = require.resolve("../src/services/sessionService");
const safetyPath = require.resolve("../src/services/safetyService");
const touched = [dbPath, authPath, sessionPath, safetyPath];

let sent = [];
let accountStatus = "active";
let revoked = [];

function load() {
  for (const path of touched) delete require.cache[path];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params) => {
        sent.push({ sql: sql.replace(/\s+/g, " ").trim(), params: params || [] });
        if (/SELECT status FROM users/i.test(sql)) return [{ status: accountStatus }];
        return [];
      },
      pool: { end: async () => {} },
    },
  };
  // Session revocation is the sessionService's job; here we only need to see
  // that suspending asks for it.
  const sessionService = require(sessionPath);
  sessionService.revokeAllSessions = async (userId) => {
    revoked.push(userId);
  };
  require.cache[sessionPath].exports = sessionService;
  return { safety: require(safetyPath), auth: require(authPath) };
}

beforeEach(() => {
  sent = [];
  revoked = [];
  accountStatus = "active";
});

after(() => {
  for (const path of touched) delete require.cache[path];
});

test("suspending ends their sessions, not just a column", async () => {
  const { safety } = load();
  await safety.setAccountStatus("user-1", "suspended");
  const update = sent.find((s) => /UPDATE users SET status/i.test(s.sql));
  assert.ok(update, "the account status should be written");
  assert.deepEqual(update.params, ["suspended", "user-1"]);
  assert.deepEqual(revoked, ["user-1"], "a suspended member must be signed out");
});

test("restoring an account does not sign anyone out", async () => {
  const { safety } = load();
  await safety.setAccountStatus("user-1", "active");
  assert.deepEqual(revoked, []);
});

test("an unknown account status is refused", async () => {
  const { safety } = load();
  await assert.rejects(
    () => safety.setAccountStatus("user-1", "banned"),
    /Unknown account status/,
  );
  assert.equal(sent.length, 0, "nothing should have been written");
});

test("a suspended member is turned away on every request", async () => {
  const { auth } = load();
  accountStatus = "suspended";
  const { signAccessToken } = require("../src/utils/jwt");
  const token = signAccessToken({ sub: "user-1" });

  let passed = null;
  await auth.requireAuth(
    { headers: { authorization: `Bearer ${token}` } },
    {},
    (error) => {
      passed = error;
    },
  );
  assert.ok(passed, "a suspended member should not get through");
  assert.equal(passed.statusCode ?? passed.status, 403);
});

test("an active member still gets through", async () => {
  const { auth } = load();
  const { signAccessToken } = require("../src/utils/jwt");
  const token = signAccessToken({ sub: "user-2" });
  const req = { headers: { authorization: `Bearer ${token}` } };

  let passed = "not called";
  await auth.requireAuth(req, {}, (error) => {
    passed = error;
  });
  assert.equal(passed, undefined, "next() should be called with no error");
  assert.equal(req.user.id, "user-2");
});

test("closing reports only touches the open ones", async () => {
  const { safety } = load();
  await safety.resolveReportsAbout("user-1", "actioned");
  const update = sent.find((s) => /UPDATE reports/i.test(s.sql));
  assert.ok(update);
  assert.match(update.sql, /review_status = 'open'/);
  assert.deepEqual(update.params, ["actioned", "user-1"]);
});

test("an unknown review status is refused", async () => {
  const { safety } = load();
  await assert.rejects(
    () => safety.resolveReportsAbout("user-1", "ignored"),
    /Unknown review status/,
  );
});

test("the queue skips deleted accounts and closed reports", async () => {
  const { safety } = load();
  await safety.listOpenReports();
  const sql = sent[0].sql;
  assert.match(sql, /review_status = 'open'/);
  assert.match(sql, /deleted_at IS NULL/);
});
