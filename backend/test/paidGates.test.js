const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * The four paid gates, each enforced on the server.
 *
 * The client is told what a member may do so it can draw the right screen,
 * but it is never asked. A gate that lives in the app is a gate that is
 * open to anyone who opens the console.
 *
 * Verified against a real MySQL as well: a free member was stopped on the
 * third like of the day, passing stayed free, a premium member liked
 * everyone, a boosted profile jumped to the top of another member's deck,
 * and the likers list locked the pending rows a free member had not paid
 * to see while leaving the matched ones visible.
 */
function load(moduleId, stubs) {
  const original = Module.prototype.require;
  Module.prototype.require = function patched(id) {
    if (stubs[id]) return stubs[id];
    return original.apply(this, arguments);
  };
  try {
    delete require.cache[require.resolve(moduleId)];
    return require(moduleId);
  } finally {
    Module.prototype.require = original;
  }
}

function matchServiceWith({ allowance, premium = false, rows = () => [] }) {
  const sqls = [];
  return {
    service: load("../src/services/matchService", {
      "../config/db": {
        query: async (sql, params) => {
          sqls.push(sql.replace(/\s+/g, " ").trim());
          return rows(sql, params);
        },
      },
      "./pushService": { notifyUser: async () => undefined },
      "./billingService": {
        likeAllowance: async () => allowance,
        isPremium: async () => premium,
      },
      "../config/billing": { freeVisibleLikers: () => 1 },
    }),
    sqls,
  };
}

const target = (sql) =>
  /^SELECT id FROM users/i.test(sql) ? [{ id: "them" }] : [];

test("a free member out of likes is refused, with a price in the message", async () => {
  const { service } = matchServiceWith({
    allowance: { premium: false, limit: 15, used: 15, remaining: 0 },
    rows: target,
  });
  await assert.rejects(
    () => service.recordDecision("me", "them", "interested"),
    (error) => {
      assert.equal(error.statusCode, 402, "out of likes is not a crash");
      assert.match(error.message, /Premium/i, "it should say how to lift it");
      return true;
    },
  );
});

test("passing is never limited", async () => {
  // Charging somebody to say no to a profile would make the deck unusable.
  const { service, sqls } = matchServiceWith({
    allowance: { premium: false, limit: 15, used: 99, remaining: 0 },
    rows: target,
  });
  await service.recordDecision("me", "them", "pass");
  assert.ok(sqls.some((sql) => /INSERT INTO match_decisions/.test(sql)));
});

test("a premium member has no limit", async () => {
  const { service, sqls } = matchServiceWith({
    allowance: { premium: true, limit: null, used: 0, remaining: null },
    premium: true,
    rows: target,
  });
  await service.recordDecision("me", "them", "interested");
  assert.ok(sqls.some((sql) => /INSERT INTO match_decisions/.test(sql)));
});

test("liking the same person twice does not cost a second like", async () => {
  // The insert is ON DUPLICATE KEY, so the second tap writes no new row.
  // Charging for it would burn an allowance on nothing.
  const { service } = matchServiceWith({
    allowance: { premium: false, limit: 15, used: 15, remaining: 0 },
    rows: (sql) => {
      if (/^SELECT id FROM users/i.test(sql)) return [{ id: "them" }];
      if (/SELECT decision FROM match_decisions/i.test(sql))
        return [{ decision: "interested" }];
      return [];
    },
  });
  await service.recordDecision("me", "them", "interested");
});

test("a free member sees the newest liker and the rest locked", async () => {
  const likeRows = [
    { actor_id: "d", created_at: "2026-01-04", username: "d", accepted: 0 },
    { actor_id: "c", created_at: "2026-01-03", username: "c", accepted: 0 },
    { actor_id: "b", created_at: "2026-01-02", username: "b", accepted: 1 },
  ];
  const { service } = matchServiceWith({
    allowance: { premium: false, limit: 15, used: 0, remaining: 15 },
    premium: false,
    rows: (sql) => (/FROM match_decisions d/i.test(sql) ? likeRows : []),
  });
  const likes = await service.getIncomingLikes("me");
  assert.equal(likes[0].locked, false, "the newest liker is the free taste");
  assert.equal(likes[1].locked, true, "the next one is the upsell");
  assert.equal(
    likes[2].locked,
    false,
    "somebody already matched stays visible - that chat is open anyway",
  );
  assert.ok(!("name" in likes[1]), "a locked row carries no name");
  assert.ok(likes[1].likedAt, "but the count and timing stay honest");
});

test("a premium member sees every liker", async () => {
  const likeRows = [
    { actor_id: "d", created_at: "2026-01-04", username: "d", accepted: 0 },
    { actor_id: "c", created_at: "2026-01-03", username: "c", accepted: 0 },
  ];
  const { service } = matchServiceWith({
    allowance: { premium: true, limit: null, used: 0, remaining: null },
    premium: true,
    rows: (sql) => (/FROM match_decisions d/i.test(sql) ? likeRows : []),
  });
  const likes = await service.getIncomingLikes("me");
  assert.ok(likes.every((like) => like.locked === false));
});

test("a boosted profile is ordered above everyone else", async () => {
  const sqls = [];
  const profileService = load("../src/services/profileService", {
    "../config/db": {
      query: async (sql) => {
        sqls.push(sql.replace(/\s+/g, " ").trim());
        return [];
      },
    },
    "./billingService": { isPremium: async () => false },
  });
  await profileService.findMatches("me", 10);
  const deck = sqls.find((sql) => /AS off_preference/.test(sql));
  assert.ok(deck, "the deck query should run");
  assert.match(deck, /FROM boosts b/, "it should know about live boosts");
  assert.match(deck, /ORDER BY boosted DESC/, "a boost has to come first");
});

test("the age range is the paid part of the filters, gender is not", async () => {
  // Showing a member the wrong gender entirely is a broken app, not a free
  // tier, so gender is honoured for everyone and only the range is sold.
  const run = async (premium) => {
    const sqls = [];
    const profileService = load("../src/services/profileService", {
      "../config/db": {
        query: async (sql) => {
          sqls.push(sql.replace(/\s+/g, " ").trim());
          return [];
        },
      },
      "./billingService": { isPremium: async () => premium },
    });
    await profileService.findMatches("me", 10);
    return sqls.find((sql) => /AS off_preference/.test(sql));
  };
  const free = await run(false);
  const paid = await run(true);
  assert.match(free, /p\.gender = \?/, "gender applies to everyone");
  assert.ok(!/p\.age BETWEEN/.test(free), "a free member gets no age range");
  assert.match(paid, /p\.age BETWEEN \? AND \?/, "premium gets the range");
});
