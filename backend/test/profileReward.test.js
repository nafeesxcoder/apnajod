/**
 * A free Super Like, once, for a 100% profile.
 *
 * Checked on the server from what is saved, so it cannot be claimed by
 * editing the app, and paid once ever.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(stubs) {
  const resolved = require.resolve("../src/services/profileRewardService");
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

const profile = {
  first_name: "Riya",
  age: 26,
  gender: "Woman",
  about: "I love long walks, filter coffee and old Hindi songs.",
  hobbies: JSON.stringify(["Travel", "Music", "Cooking"]),
  city: "Pune",
  profession: "Designer",
  verified: 1,
  verification_status: "approved",
};
const intent = { timeline: "1-2 years", children: "Open", family: "Close", relocation: "" };

const pure = load({
  "../config/db": { query: async () => [] },
  "./billingService": { addCredits: async () => undefined },
  "./pushService": { notifyUser: async () => undefined },
});

test("complete means every step the Profile strength card counts", () => {
  assert.equal(pure.isComplete({ profile, intent, photos: 1 }), true);
  for (const [label, change] of [
    ["no photo", { photos: 0 }],
    ["short bio", { profile: { ...profile, about: "Hi there" } }],
    ["two hobbies", { profile: { ...profile, hobbies: '["A","B"]' } }],
    ["no work", { profile: { ...profile, profession: "" } }],
    ["selfie pending", { profile: { ...profile, verified: 0, verification_status: "pending" } }],
    ["two future answers", { intent: { timeline: "x", children: "y" } }],
    ["no profile", { profile: undefined }],
  ]) {
    assert.equal(pure.isComplete({ profile, intent, photos: 1, ...change }), false, label);
  }
});

function world({ complete = true } = {}) {
  const rewards = new Set();
  const credits = [];
  const pushes = [];
  const service = load({
    "../config/db": {
      query: async (sql, params = []) => {
        const s = sql.replace(/\s+/g, " ").trim();
        if (s.startsWith("SELECT first_name")) return [complete ? profile : { ...profile, about: "" }];
        if (s.startsWith("SELECT timeline")) return [intent];
        if (s.startsWith("SELECT COUNT(*) AS n FROM profile_photos")) return [{ n: 1 }];
        if (s.startsWith("INSERT IGNORE INTO profile_rewards")) {
          const key = params.join("|");
          if (rewards.has(key)) return { affectedRows: 0 };
          rewards.add(key);
          return { affectedRows: 1 };
        }
        if (s.startsWith("SELECT 1 AS yes FROM profile_rewards")) return rewards.has(params.join("|")) ? [{ yes: 1 }] : [];
        return [];
      },
    },
    "./billingService": { addCredits: async (user, kind, quantity) => credits.push({ user, kind, quantity }) },
    "./pushService": { notifyUser: async (user, payload) => pushes.push({ user, payload }) },
  });
  return { service, credits, pushes };
}

test("reaching 100% pays one Super Like and says so - once ever", async () => {
  const { service, credits, pushes } = world();
  assert.equal(await service.claimed("u1"), false);
  assert.deepEqual(await service.rewardIfComplete("u1"), { kind: "superlike", quantity: 1 });
  assert.equal(await service.rewardIfComplete("u1"), null, "second save pays nothing");
  assert.deepEqual(credits, [{ user: "u1", kind: "superlike", quantity: 1 }]);
  assert.equal(pushes.length, 1);
  assert.match(pushes[0].payload.title, /Profile complete/);
  assert.equal(await service.claimed("u1"), true);
});

test("an incomplete profile pays nothing", async () => {
  const { service, credits } = world({ complete: false });
  assert.equal(await service.rewardIfComplete("u1"), null);
  assert.equal(credits.length, 0);
});

test("the 100% rule matches the app's Profile strength card", () => {
  const fs = require("node:fs");
  const app = fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "src", "domain", "profileStrength.ts"), "utf8");
  assert.match(app, new RegExp(`BIO_MIN = ${pure.BIO_MIN};`));
  assert.match(app, new RegExp(`HOBBIES_MIN = ${pure.HOBBIES_MIN};`));
});
