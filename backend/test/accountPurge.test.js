/**
 * Deleted accounts are really gone after 30 days - but payments stay.
 *
 * The privacy policy promises both. Before this, the purge job existed but
 * nothing ever ran it, and when it did run, payments.user_id cascaded and
 * took the tax records with it. The account's photo files also stayed on
 * disk forever.
 */
const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(stubs) {
  const resolved = require.resolve("../src/services/userService");
  const from = path.dirname(resolved);
  const saved = new Map();
  for (const [id, exports] of Object.entries(stubs)) {
    const key = require.resolve(path.resolve(from, id));
    saved.set(key, require.cache[key]);
    require.cache[key] = { id: key, filename: key, loaded: true, exports };
  }
  delete require.cache[resolved];
  try {
    return require(resolved);
  } finally {
    for (const [key, entry] of saved) {
      if (entry) require.cache[key] = entry;
      else delete require.cache[key];
    }
    delete require.cache[resolved];
  }
}

const uploads = path.join(__dirname, "..", "uploads");
const made = [];
after(() => made.forEach((file) => fs.rmSync(file, { force: true })));

function touch(dir, name) {
  fs.mkdirSync(path.join(uploads, dir), { recursive: true });
  const file = path.join(uploads, dir, name);
  fs.writeFileSync(file, "x");
  made.push(file);
  return file;
}

test("only real upload files can be targeted, nothing outside uploads", () => {
  const { uploadedFilePath } = load({ "../config/db": { query: async () => [] } });
  assert.equal(
    uploadedFilePath("https://apnajoda.com/api/uploads/photos/abc-1.jpg"),
    path.join(uploads, "photos", "abc-1.jpg"),
  );
  assert.equal(
    uploadedFilePath("https://apnajoda.com/api/uploads/chat/v.webm?x=1"),
    path.join(uploads, "chat", "v.webm"),
  );
  for (const bad of [
    "https://apnajoda.com/api/uploads/photos/../../.env",
    "https://apnajoda.com/api/uploads/photos/.env",
    "https://apnajoda.com/api/uploads/other/a.jpg",
    "https://cdn.example.com/a.jpg",
    "",
    null,
  ]) {
    assert.equal(uploadedFilePath(bad), null, String(bad));
  }
});

test("expired accounts are deleted with their photo files; payments are never touched", async () => {
  const photo = touch("photos", "purge-test-photo.jpg");
  const selfie = touch("photos", "purge-test-selfie.jpg");
  const post = touch("chat", "purge-test-post.mp4");
  const sqls = [];
  const service = load({
    "../config/db": {
      query: async (sql, params = []) => {
        const s = sql.replace(/\s+/g, " ").trim();
        sqls.push(s);
        if (s.startsWith("SELECT id FROM users")) return [{ id: "gone" }];
        if (s.startsWith("SELECT photo_url")) return [{ url: "https://apnajoda.com/api/uploads/photos/purge-test-photo.jpg" }];
        if (s.startsWith("SELECT selfie_uri")) return [{ url: "https://apnajoda.com/api/uploads/photos/purge-test-selfie.jpg" }];
        if (s.startsWith("SELECT media_url")) return [{ url: "https://apnajoda.com/api/uploads/chat/purge-test-post.mp4" }];
        if (s.startsWith("DELETE FROM users")) {
          assert.deepEqual(params, ["gone"]);
          return { affectedRows: 1 };
        }
        return [];
      },
    },
  });
  assert.equal(await service.purgeExpiredDeletedUsers(), 1);
  for (const file of [photo, selfie, post]) assert.equal(fs.existsSync(file), false, file);
  assert.ok(!sqls.some((s) => /payments/i.test(s)), "the purge must not touch payments");
});

test("someone who logged back in during the purge keeps their account and files", async () => {
  const photo = touch("photos", "purge-test-kept.jpg");
  const service = load({
    "../config/db": {
      query: async (sql) => {
        const s = sql.replace(/\s+/g, " ").trim();
        if (s.startsWith("SELECT id FROM users")) return [{ id: "back" }];
        if (s.startsWith("SELECT photo_url")) return [{ url: "/api/uploads/photos/purge-test-kept.jpg" }];
        if (s.startsWith("DELETE FROM users")) return { affectedRows: 0 };
        return [];
      },
    },
  });
  assert.equal(await service.purgeExpiredDeletedUsers(), 0);
  assert.equal(fs.existsSync(photo), true);
});

test("payments outlive the account", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "src", "migrations", "042_keep_payment_records.sql"),
    "utf8",
  );
  assert.match(sql, /ALTER TABLE payments DROP FOREIGN KEY fk_payment_user/);
});

test("the purge actually runs: the server starts it", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");
  assert.match(server, /require\('\.\/jobs\/cleanupDeletedUsers'\)\.start\(\)/);
});
