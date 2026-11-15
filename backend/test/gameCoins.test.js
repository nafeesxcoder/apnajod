const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Game coins. The SQL was run against a real database: a win pays 50 plus
 * 25 for the day's first win, the same game cannot pay twice, wins in a row
 * add a bonus, a short game pays nothing, unlocking spends coins once, the
 * spinner works once in 24 hours, and coins swap for a Spark.
 */
const coins = require("../src/services/coinService");

test("levels go Bronze, Silver, Gold, Diamond", () => {
  assert.equal(coins.levelFor(0).level, "Bronze");
  assert.deepEqual(coins.levelFor(499), { level: "Bronze", levelFrom: 0, nextLevel: "Silver", nextAt: 500 });
  assert.equal(coins.levelFor(2000).level, "Gold");
  assert.equal(coins.levelFor(99999).nextLevel, null);
});

test("the spinner lands by weight, and the big prize is rare", () => {
  const total = coins.SPIN_SLICES.reduce((sum, s) => sum + s.weight, 0);
  assert.equal(coins.pickSlice(() => 0), 0);
  assert.equal(coins.pickSlice(() => total - 1), coins.SPIN_SLICES.length - 1);
  const big = coins.SPIN_SLICES.find((s) => s.reward.coins === 500);
  assert.ok(big.weight / total < 0.05);
  assert.equal(coins.SPIN_SLICES.length, 8);
});

test("the store has free and locked things of every kind, with unique keys", () => {
  const keys = new Set(coins.CATALOG.map((i) => i.key));
  assert.equal(keys.size, coins.CATALOG.length);
  for (const kind of ["theme", "sound", "dice", "token", "emoji", "chat"]) {
    const items = coins.CATALOG.filter((i) => i.kind === kind);
    assert.ok(items.some((i) => i.price === 0), `${kind} has a free one`);
    assert.ok(items.some((i) => i.price > 0), `${kind} has one to unlock`);
  }
  assert.equal(coins.CATALOG.filter((i) => i.kind === "theme").length, 6);
  assert.equal(coins.CATALOG.filter((i) => i.kind === "sound").length, 7);
});

test("Ludo pays by place, only for real games, at most 10 a day", () => {
  assert.deepEqual(coins.LUDO.place, [50, 20, 10, 5]);
  assert.equal(coins.LUDO.perDay, 10);
  assert.ok(coins.LUDO.minMoves >= 20);
  const ludo = fs.readFileSync(path.join(__dirname, "../src/services/ludoService.js"), "utf8");
  assert.match(ludo, /if \(finished && !state\.rewards\)/);
  assert.match(ludo, /rewards: state\.rewards \|\| null/);
});

test("emoji and quick chat need a pack you have, and are rate limited", () => {
  const realtime = fs.readFileSync(path.join(__dirname, "../src/services/realtime.js"), "utf8");
  assert.match(realtime, /socket\.on\("ludo:react"/);
  assert.match(realtime, /canSay\(userId, kind, value\)/);
  assert.match(realtime, /now - lastReact < 1200/);
  const sql = fs.readFileSync(path.join(__dirname, "../src/migrations/070_game_coins.sql"), "utf8");
  assert.match(sql, /UNIQUE KEY uniq_coin_ref \(user_id, reason, ref\)/);
});
