/**
 * "Show my family" links.
 *
 * Your own profile any time; someone else's only after a mutual match;
 * never across a block; limited to 20 a day; the public view leaves out
 * anything to find or contact them by, and stops when the link expires,
 * an account closes, or the match ends.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(stubs) {
  const resolved = require.resolve("../src/services/shareService");
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

const TOKEN = "a".repeat(32);

function world({ live = ["me", "them"], matched = true, blocked = false, madeToday = 0, share = null } = {}) {
  const inserted = [];
  const query = async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT 1 FROM users")) return live.includes(params[0]) ? [{ 1: 1 }] : [];
    if (s.startsWith("SELECT 1 FROM mutual_matches")) return matched ? [{ 1: 1 }] : [];
    if (s.startsWith("SELECT 1 FROM blocks")) return blocked ? [{ 1: 1 }] : [];
    if (s.startsWith("SELECT COUNT(*) AS made")) return [{ made: madeToday }];
    if (s.startsWith("INSERT INTO profile_shares")) {
      inserted.push(params);
      return { affectedRows: 1 };
    }
    if (s.startsWith("SELECT expires_at FROM profile_shares")) return [{ expires_at: "2026-11-19 10:00:00.000000" }];
    if (s.startsWith("SELECT sharer_id, target_id")) return share ? [share] : [];
    if (s.startsWith("SELECT first_name FROM profiles")) return [{ first_name: "Nafees" }];
    return { affectedRows: 1 };
  };
  const service = load({
    "../config/db": { query },
    "../config/env": { appUrl: "https://apnajoda.com/" },
    "./followService": {
      getProfileCard: async () => ({
        firstName: "Riya",
        age: 26,
        city: "Bareilly",
        profession: "Teacher",
        about: "Hi",
        verified: true,
        religion: "SHOULD NOT LEAK",
        community: "SHOULD NOT LEAK",
        photos: ["1", "2", "3", "4"],
        intent: { intent: "Marriage" },
      }),
    },
  });
  return { service, inserted };
}

test("your own profile can always be shared", async () => {
  const { service, inserted } = world({ matched: false });
  const result = await service.create("me", null);
  assert.equal(inserted.length, 1);
  assert.equal(result.own, true);
  assert.match(result.url, /^https:\/\/apnajoda\.com\/\?share=[a-f0-9]{32}$/);
  assert.equal(result.expiresAt, "2026-11-19T10:00:00.000Z");
});

test("someone else's profile only after a mutual match", async () => {
  const { service, inserted } = world({ matched: false });
  await assert.rejects(() => service.create("me", "them"), (e) => e.statusCode === 403);
  assert.equal(inserted.length, 0);
  const ok = world({ matched: true });
  assert.equal((await ok.service.create("me", "them")).own, false);
});

test("never across a block, never for a closed account, and at most 20 a day", async () => {
  await assert.rejects(() => world({ blocked: true }).service.create("me", "them"), (e) => e.statusCode === 404);
  await assert.rejects(() => world({ live: ["me"] }).service.create("me", "them"), (e) => e.statusCode === 404);
  await assert.rejects(() => world({ madeToday: 20 }).service.create("me", null), (e) => e.statusCode === 429);
});

test("the public view is limited: no username, religion or community, three photos at most", async () => {
  const { service } = world({
    share: { sharer_id: "me", target_id: "them", expires_at: "2026-11-19 10:00:00", live: 1 },
  });
  const result = await service.view(TOKEN);
  assert.equal(result.sharedBy, "Nafees");
  assert.equal(result.profile.firstName, "Riya");
  assert.equal(result.profile.photos.length, 3);
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /SHOULD NOT LEAK/);
  assert.equal(result.profile.username, undefined);
});

test("a link stops working when it expires, the match ends, or an account closes", async () => {
  const share = { sharer_id: "me", target_id: "them", expires_at: "2026-11-01 10:00:00", live: 0 };
  await assert.rejects(() => world({ share }).service.view(TOKEN), (e) => e.statusCode === 410);
  const liveShare = { ...share, live: 1 };
  await assert.rejects(() => world({ share: liveShare, matched: false }).service.view(TOKEN), (e) => e.statusCode === 410);
  await assert.rejects(() => world({ share: liveShare, live: ["me"] }).service.view(TOKEN), (e) => e.statusCode === 410);
});

test("a malformed or unknown token is simply not found", async () => {
  const { service } = world();
  await assert.rejects(() => service.view("not-a-token"), (e) => e.statusCode === 404);
  await assert.rejects(() => service.view(TOKEN), (e) => e.statusCode === 404);
});
