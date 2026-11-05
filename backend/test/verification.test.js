/**
 * The rule that makes the verified badge mean something.
 *
 * Submitting a selfie only sets 'pending'. Approving is the one thing that
 * may set `verified = 1`, and the badge the whole product rests on is read
 * off that column. If any other status ever set it, every member who merely
 * uploaded a photo would be shown as checked by a person.
 *
 * This stubs the database rather than reaching for MySQL: what is being
 * tested is the mapping from status to `verified`, which is plain logic, so
 * it should run on a machine with no database at all.
 */
const assert = require("node:assert/strict");
const { test, beforeEach, after } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

const dbPath = require.resolve("../src/config/db");
const servicePath = require.resolve("../src/services/profileService");

/** Every statement the service sent, with its parameters. */
let sent = [];

function loadServiceWithStubbedDb() {
  delete require.cache[dbPath];
  delete require.cache[servicePath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async (sql, params) => {
        sent.push({ sql, params: params || [] });
        return [];
      },
      pool: { end: async () => {} },
    },
  };
  return require(servicePath);
}

beforeEach(() => {
  sent = [];
});

after(() => {
  delete require.cache[dbPath];
  delete require.cache[servicePath];
});

test("approving is the only thing that sets verified", async () => {
  const profileService = loadServiceWithStubbedDb();
  await profileService.setVerificationStatus("user-1", "approved");
  assert.equal(sent.length, 1);
  const [status, verified, userId] = sent[0].params;
  assert.equal(status, "approved");
  assert.equal(verified, 1, "approved must set verified");
  assert.equal(userId, "user-1");
});

test("every other status leaves verified off", async () => {
  const profileService = loadServiceWithStubbedDb();
  for (const status of ["none", "pending", "rejected"]) {
    sent = [];
    await profileService.setVerificationStatus("user-1", status);
    const [sentStatus, verified] = sent[0].params;
    assert.equal(sentStatus, status);
    assert.equal(verified, 0, `${status} must not set verified`);
  }
});

test("an unknown status is refused rather than written", async () => {
  const profileService = loadServiceWithStubbedDb();
  await assert.rejects(
    () => profileService.setVerificationStatus("user-1", "verified"),
    /Unknown verification status/,
  );
  assert.equal(sent.length, 0, "nothing should have been written");
});

test("submitting a selfie never verifies on its own", async () => {
  const profileService = loadServiceWithStubbedDb();
  await profileService.submitVerification("user-1", "/uploads/selfie.jpg");
  assert.equal(sent.length, 1);
  const sql = sent[0].sql.replace(/\s+/g, " ");
  assert.match(sql, /verification_status = 'pending'/);
  assert.match(sql, /verified = 0/);
});

test("the pending queue only returns people actually waiting", async () => {
  const profileService = loadServiceWithStubbedDb();
  await profileService.listPendingVerifications();
  const sql = sent[0].sql.replace(/\s+/g, " ");
  assert.match(sql, /verification_status = 'pending'/);
  assert.match(sql, /deleted_at IS NULL/, "a deleted account is not a queue item");
});
