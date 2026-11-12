/**
 * Aaj ke 5.
 *
 * New set at 9 PM IST, the same five all day, built once, best matches
 * first, nobody outside the member's preferences, and the evening push
 * goes out once per person and only in the evening.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(stubs) {
  const resolved = require.resolve("../src/services/dailyPicksService");
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

const pure = load({
  "../config/db": { query: async () => [] },
  "./pushService": { notifyUser: async () => undefined },
  "./profileService": { findMatches: async () => [] },
});

test("the set changes at 9 PM India time, not midnight", () => {
  // 20:59 IST on the 12th still belongs to the 12th's set.
  assert.equal(pure.pickDay(new Date("2026-11-12T15:29:00Z")), "2026-11-12");
  // 21:01 IST is the 13th's set.
  assert.equal(pure.pickDay(new Date("2026-11-12T15:31:00Z")), "2026-11-13");
  assert.equal(
    pure.nextPicksAt(new Date("2026-11-13T05:00:00Z")).toISOString(),
    "2026-11-13T15:30:00.000Z",
    "next set is 21:00 IST",
  );
});

const person = (id, extra = {}) => ({
  id,
  photo: `https://x/${id}.jpg`,
  hobbies: [],
  city: "",
  intent: "",
  verified: false,
  about: "",
  offPreference: false,
  ...extra,
});

test("best matches first, five at most", () => {
  const me = { city: "Bareilly", hobbies: ["Travel", "Music"], intent: "marriage" };
  const pool = [
    person("a"),
    person("b", { hobbies: ["music"], city: "Bareilly", intent: "marriage", verified: true }),
    person("c", { hobbies: ["travel"] }),
    person("d"),
    person("e"),
    person("f"),
    person("g"),
  ];
  const picks = pure.choose(pool, me).map((p) => p.id);
  assert.equal(picks.length, 5);
  assert.equal(picks[0], "b", "shares the most");
  assert.equal(picks[1], "c");
});

test("never picks someone outside their preferences, without a photo, or picked this week", () => {
  const pool = [
    person("off", { offPreference: true, verified: true }),
    person("nophoto", { photo: "" }),
    person("seen"),
    person("ok"),
  ];
  const picks = pure.choose(pool, { hobbies: [] }, new Set(["seen"])).map((p) => p.id);
  assert.deepEqual(picks, ["ok"]);
});

/* ---------- forMember: built once, same all day ---------- */

function world({ pool }) {
  const rows = [];
  let builds = 0;
  const query = async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT dp.target_id, dp.card")) {
      return rows
        .filter((r) => r.user_id === params[0] && r.pick_day === params[1])
        .sort((a, b) => a.position - b.position)
        .map((r) => ({ target_id: r.target_id, card: r.card, decision: null }));
    }
    if (s.startsWith("SELECT 1 FROM daily_picks")) {
      return rows.some((r) => r.user_id === params[0] && r.pick_day === params[1]) ? [{ 1: 1 }] : [];
    }
    if (s.startsWith("INSERT IGNORE INTO daily_picks")) {
      const [user_id, pick_day, position, target_id, card] = params;
      if (rows.some((r) => r.user_id === user_id && r.pick_day === pick_day && r.position === position)) {
        return { affectedRows: 0 };
      }
      rows.push({ user_id, pick_day, position, target_id, card });
      return { affectedRows: 1 };
    }
    if (s.startsWith("SELECT DISTINCT target_id FROM daily_picks")) return [];
    if (s.startsWith("SELECT city, hobbies FROM profiles")) return [{ city: "", hobbies: "[]" }];
    if (s.startsWith("SELECT intent FROM profile_intent")) return [];
    return [];
  };
  const service = load({
    "../config/db": { query },
    "./pushService": { notifyUser: async () => undefined },
    "./profileService": {
      findMatches: async () => {
        builds += 1;
        return pool();
      },
    },
  });
  return { service, rows, builds: () => builds };
}

test("the five are built once and stay the same all day", async () => {
  let shuffle = 0;
  const { service, builds } = world({
    pool: () => {
      shuffle += 1;
      const base = ["a", "b", "c", "d", "e", "f"].map((id) => person(id));
      return shuffle % 2 ? base : base.reverse();
    },
  });
  const morning = await service.forMember("me", new Date("2026-11-13T04:00:00Z"));
  const evening = await service.forMember("me", new Date("2026-11-13T14:00:00Z"));
  assert.equal(morning.picks.length, 5);
  assert.deepEqual(
    evening.picks.map((p) => p.id),
    morning.picks.map((p) => p.id),
  );
  assert.equal(builds(), 1, "built once for the day");
  assert.equal(morning.picks[0].pickStatus, "new");
});

/* ---------- the evening push ---------- */

function pushWorld(users) {
  const notices = new Set();
  const pushed = [];
  const service = load({
    "../config/db": {
      query: async (sql, params = []) => {
        const s = sql.replace(/\s+/g, " ").trim();
        if (s.startsWith("SELECT u.id FROM users u")) {
          return users.filter((id) => !notices.has(`${id}|${params[0]}`)).map((id) => ({ id }));
        }
        if (s.startsWith("INSERT IGNORE INTO daily_pick_notices")) {
          const key = `${params[0]}|${params[1]}`;
          if (notices.has(key)) return { affectedRows: 0 };
          notices.add(key);
          return { affectedRows: 1 };
        }
        return [];
      },
    },
    "./pushService": { notifyUser: async (id) => pushed.push(id) },
    "./profileService": { findMatches: async () => [] },
  });
  return { service, pushed };
}

test("the 9 PM push goes once per person, and never in the small hours", async () => {
  const { service, pushed } = pushWorld(["u1", "u2"]);
  assert.equal(await service.notifyOnce(new Date("2026-11-12T10:00:00Z")), 0, "15:30 IST - too early");
  assert.equal(await service.notifyOnce(new Date("2026-11-12T21:30:00Z")), 0, "03:00 IST - too late");
  assert.equal(await service.notifyOnce(new Date("2026-11-12T15:35:00Z")), 2, "21:05 IST");
  assert.equal(await service.notifyOnce(new Date("2026-11-12T16:00:00Z")), 0, "already told today");
  assert.deepEqual(pushed, ["u1", "u2"]);
});
