/**
 * Apnajoda is 18+, and the server enforces it.
 *
 * The age check used to live only in the app's sign-up screen. Anyone
 * calling PUT /profile/profile directly could save an age of 15, and that
 * profile went into everyone's deck.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { readFileSync } = require("node:fs");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(stubs) {
  const resolved = require.resolve("../src/services/profileService");
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

function world() {
  const writes = [];
  const service = load({
    "../config/db": {
      query: async (sql, params) => {
        writes.push({ sql, params });
        return [];
      },
    },
  });
  return { service, writes };
}

test("under 18, over 70, or not a whole number is refused and nothing is saved", async () => {
  for (const age of [15, 17, "17", 71, 18.5, "abc", -1]) {
    const { service, writes } = world();
    await assert.rejects(
      () => service.upsertProfile("u1", { firstName: "A", age }),
      (e) => e.statusCode === 400 && /18 or older/.test(e.message),
      String(age),
    );
    assert.equal(writes.length, 0, `${age} reached the database`);
  }
});

test("18 to 70 is saved as a number", async () => {
  for (const [sent, stored] of [[18, 18], ["24", 24], [70, 70]]) {
    const { service, writes } = world();
    await service.upsertProfile("u1", { firstName: "A", age: sent });
    assert.equal(writes[0].params[3], stored);
  }
});

test("a save without an age keeps the saved age instead of wiping it", async () => {
  const { service, writes } = world();
  await service.upsertProfile("u1", { firstName: "A" });
  assert.equal(writes[0].params[3], null);
  assert.match(writes[0].sql, /age = COALESCE\(VALUES\(age\), age\)/);
});

test("the deck never shows anyone under 18, even one saved before this check", () => {
  const source = readFileSync(require.resolve("../src/services/profileService.js"), "utf8");
  const start = source.indexOf("async function findMatches");
  const body = source.slice(start, source.indexOf("async function", start + 10));
  assert.match(body, /AND \(p\.age IS NULL OR p\.age >= \$\{MIN_AGE\}\)/);
});
