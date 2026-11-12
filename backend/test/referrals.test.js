/**
 * Invite & earn.
 *
 * The invite link was captured by the app but never reached the server, so
 * nobody was ever credited. Now: a new member who signs up from a link and
 * fills in a real profile earns their inviter a Boost and themselves a
 * Super Like - once, never for yourself, at most ten a month.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(stubs) {
  const resolved = require.resolve("../src/services/referralService");
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

/** A tiny in-memory world: users, profiles, referrals, credits, pushes. */
function world({ users = {}, profiles = {}, rewardedThisMonth = 0 } = {}) {
  const referrals = new Map();
  const credits = [];
  const pushes = [];
  const query = async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT id FROM users")) {
      const id = users[params[0]];
      return id ? [{ id }] : [];
    }
    if (s.startsWith("INSERT IGNORE INTO referrals")) {
      if (referrals.has(params[0])) return { affectedRows: 0 };
      referrals.set(params[0], { inviter_id: params[1], settled_at: null, outcome: null });
      return { affectedRows: 1 };
    }
    if (s.startsWith("SELECT inviter_id FROM referrals")) {
      const r = referrals.get(params[0]);
      return r && !r.settled_at ? [{ inviter_id: r.inviter_id }] : [];
    }
    if (s.startsWith("SELECT p.first_name, p.age")) {
      const p = profiles[params[0]];
      return p ? [p] : [];
    }
    if (s.startsWith("SELECT COUNT(*) AS n FROM referrals")) return [{ n: rewardedThisMonth }];
    if (s.startsWith("UPDATE referrals SET settled_at")) {
      const r = referrals.get(params[1]);
      if (!r || r.settled_at) return { affectedRows: 0 };
      r.settled_at = "now";
      r.outcome = params[0];
      return { affectedRows: 1 };
    }
    if (s.startsWith("SELECT first_name FROM profiles")) return [{ first_name: "Riya" }];
    return [];
  };
  const service = load({
    "../config/db": { query },
    "./billingService": { addCredits: async (user, kind, quantity) => credits.push({ user, kind, quantity }) },
    "./pushService": { notifyUser: async (user, payload) => pushes.push({ user, payload }) },
  });
  return { service, referrals, credits, pushes };
}

const complete = { first_name: "Riya", age: 25, photos: 1 };

test("a signup from an invite link is remembered once", async () => {
  const { service, referrals } = world({ users: { nafees: "inviter" } });
  assert.equal(await service.recordSignup("newbie", "@Nafees "), true);
  assert.equal(await service.recordSignup("newbie", "nafees"), false, "counted once");
  assert.equal(referrals.get("newbie").inviter_id, "inviter");
});

test("unknown names, junk, and inviting yourself are ignored without failing signup", async () => {
  const { service, referrals } = world({ users: { me: "me" } });
  assert.equal(await service.recordSignup("x", "nobody"), false);
  assert.equal(await service.recordSignup("x", "<script>"), false);
  assert.equal(await service.recordSignup("x", ""), false);
  assert.equal(await service.recordSignup("me", "me"), false, "self-invite");
  assert.equal(referrals.size, 0);
});

test("no reward until the new member has a name, an age and a photo", async () => {
  const { service, credits } = world({
    users: { nafees: "inviter" },
    profiles: { newbie: { first_name: "Riya", age: 25, photos: 0 } },
  });
  await service.recordSignup("newbie", "nafees");
  assert.equal(await service.rewardIfReady("newbie"), null);
  assert.equal(credits.length, 0);
});

test("a real profile pays a Boost to the inviter and a Super Like to the new member - once", async () => {
  const { service, credits, pushes } = world({ users: { nafees: "inviter" }, profiles: { newbie: complete } });
  await service.recordSignup("newbie", "nafees");
  assert.equal(await service.rewardIfReady("newbie"), "rewarded");
  assert.equal(await service.rewardIfReady("newbie"), null, "second save pays nothing");
  assert.deepEqual(credits, [
    { user: "inviter", kind: "boost", quantity: 1 },
    { user: "newbie", kind: "superlike", quantity: 1 },
  ]);
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0].user, "inviter");
  assert.match(pushes[0].payload.body, /Riya joined/);
});

test("past ten a month the inviter gets no Boost, but the new member still gets their gift", async () => {
  const { service, credits, referrals } = world({
    users: { nafees: "inviter" },
    profiles: { newbie: complete },
    rewardedThisMonth: 10,
  });
  await service.recordSignup("newbie", "nafees");
  assert.equal(await service.rewardIfReady("newbie"), "capped");
  assert.deepEqual(credits, [{ user: "newbie", kind: "superlike", quantity: 1 }]);
  assert.equal(referrals.get("newbie").outcome, "capped");
});

test("someone who was not invited is never paid anything", async () => {
  const { service, credits } = world({ profiles: { solo: complete } });
  assert.equal(await service.rewardIfReady("solo"), null);
  assert.equal(credits.length, 0);
});
