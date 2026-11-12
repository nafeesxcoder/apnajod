/**
 * Admin Growth page.
 *
 * Every number is per India day, the window is 7, 14 or 30 days, and a day
 * with nothing is a zero rather than a gap. Daily active members come from
 * member_active_days, written at most once a day per member.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(modulePath, stubs) {
  const resolved = require.resolve(modulePath);
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

const growth = require("../src/services/growthService");

test("days are India days, oldest first, ending today", () => {
  // 20:00 UTC on the 12th is 01:30 on the 13th in India.
  const now = Date.parse("2026-11-12T20:00:00Z");
  assert.deepEqual(growth.dayList(3, now), ["2026-11-11", "2026-11-12", "2026-11-13"]);
});

test("only 7, 14 or 30 days; anything else is 14", () => {
  assert.equal(growth.cleanDays("7"), 7);
  assert.equal(growth.cleanDays(30), 30);
  for (const bad of [undefined, "", "365", "1; DROP TABLE users", -1]) {
    assert.equal(growth.cleanDays(bad), 14, String(bad));
  }
});

test("a day with nothing is a zero, the window is respected, and SQL never carries the request", async () => {
  const seen = [];
  const service = load("../src/services/growthService", {
    "../config/db": {
      query: async (sql, params = []) => {
        const s = sql.replace(/\s+/g, " ").trim();
        seen.push(s);
        if (s.startsWith("SELECT TIMESTAMPDIFF")) return [{ m: 0 }];
        if (s.includes("FROM users") && s.includes("GROUP BY day")) {
          return [{ day: "2026-11-13", n: 4 }, { day: "2026-10-01", n: 99 }];
        }
        if (s.includes("FROM member_active_days WHERE day >=")) return [{ day: "2026-11-13", n: 2 }];
        if (s.startsWith("SELECT MIN(day)")) return [{ first: "2026-11-13" }];
        if (s.includes("COUNT(*) AS total FROM member_active_days")) return [{ total: 2 }];
        return [];
      },
    },
  });
  const result = await service.getGrowth({ days: "7; DROP", now: Date.parse("2026-11-12T20:00:00Z") });
  assert.equal(result.days.length, 14, "bad input falls back to 14");
  assert.equal(result.days.at(-1), "2026-11-13");
  assert.equal(result.series.signups.at(-1), 4);
  assert.equal(result.series.signups.reduce((a, b) => a + b, 0), 4, "a day outside the window is dropped");
  assert.equal(result.series.active.at(-1), 2);
  assert.equal(result.series.messages.length, 14, "every metric has every day");
  assert.equal(result.active.today, 2);
  assert.equal(result.activeTrackingSince, "2026-11-13");
  // IST shift with a UTC database is +330 minutes.
  assert.ok(seen.some((s) => s.includes("INTERVAL 330 MINUTE")));
  assert.ok(!seen.some((s) => s.includes("DROP")));
});

test("a missing table reads as zeros instead of breaking the page", async () => {
  const service = load("../src/services/growthService", {
    "../config/db": {
      query: async () => {
        throw new Error("Table 'referrals' doesn't exist");
      },
    },
  });
  const original = console.log;
  console.log = () => undefined;
  try {
    const result = await service.getGrowth({ days: 7 });
    assert.deepEqual(result.series.invites, [0, 0, 0, 0, 0, 0, 0]);
    assert.equal(result.funnel.members, 0);
  } finally {
    console.log = original;
  }
});

test("a member's active day is written once a day, not on every request", async () => {
  const writes = [];
  const realNow = Date.now;
  let clock = Date.parse("2026-11-12T10:00:00Z");
  Date.now = () => clock;
  try {
    const auth = load("../src/middleware/auth", {
      "../config/db": {
        query: async (sql, params) => {
          if (sql.includes("member_active_days")) writes.push(params);
          if (sql.includes("SELECT status")) return [{ status: "active" }];
          return { affectedRows: 1 };
        },
      },
      "../utils/jwt": { verifyAccessToken: () => ({ sub: "u1" }) },
    });
    const call = () =>
      new Promise((resolve) =>
        auth.requireAuth({ headers: { authorization: "Bearer t" } }, {}, resolve),
      );
    await call();
    clock += 60 * 1000; // a minute later, same day
    await call();
    clock += 12 * 60 * 60 * 1000; // past midnight in India
    await call();
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(writes, [["u1", "2026-11-12"], ["u1", "2026-11-13"]]);
  } finally {
    Date.now = realNow;
  }
});
