const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

const backfill = readFileSync(require.resolve("../src/services/fieldBackfill.js"), "utf8");
const migration = readFileSync(require.resolve("../src/migrations/074_field_encryption.sql"), "utf8");
const pkg = readFileSync(require.resolve("../package.json"), "utf8");

test("the back-fill only picks rows whose hash is still missing", () => {
  assert.ok(backfill.includes("phone_hash IS NULL"));
  assert.ok(backfill.includes("email_hash IS NULL"));
  assert.ok(backfill.includes("phone <> ''"));
});

test("the back-fill never encrypts a value twice", () => {
  assert.ok(backfill.includes("isEncrypted(row.phone) ? row.phone : encrypt(plainPhone)"));
  assert.ok(backfill.includes("isEncrypted(row.email) ? row.email : encrypt(plainEmail)"));
});

test("the migration widens the columns and adds the blind-index columns", () => {
  assert.ok(migration.includes("MODIFY COLUMN phone VARCHAR(100)"));
  assert.ok(migration.includes("MODIFY COLUMN email VARCHAR(512)"));
  assert.ok(migration.includes("ADD COLUMN phone_hash CHAR(64)"));
  assert.ok(migration.includes("ADD COLUMN email_hash CHAR(64)"));
  assert.ok(migration.includes("uniq_users_phone_hash"));
  assert.ok(migration.includes("uniq_users_email_hash"));
});

test("the back-fill has an npm script and runs by hand", () => {
  assert.ok(pkg.includes('"backfill:encrypt": "node src/services/fieldBackfill.js"'));
});
