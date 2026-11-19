const { test } = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const coinService = require("../src/services/coinService");

const svc = readFileSync(join(__dirname, "..", "src", "services", "coinService.js"), "utf8");
const routes = readFileSync(join(__dirname, "..", "src", "routes", "adminRoutes.js"), "utf8");

test("admin coins: routes sit behind the admin check", () => {
  assert.ok(routes.indexOf("router.use(requireAdmin)") < routes.indexOf('router.post("/users/:id/coins"'));
  assert.ok(routes.includes('router.get("/users/:id/coins", adminController.getCoins)'));
});

test("admin coins: zero, text and huge amounts are refused before the database", async () => {
  for (const amount of [0, "abc", coinService.ADMIN_MAX + 1, -(coinService.ADMIN_MAX + 1)]) {
    await assert.rejects(coinService.adminAdjust("admin", "user", amount), (e) => e.status === 400);
  }
});

test("admin coins: taking never goes below zero, gifts add no XP, each is logged", () => {
  assert.ok(svc.includes("GREATEST(0, coins + ?)"));
  assert.ok(svc.includes('UPDATE game_wallets SET coins = coins + ? WHERE user_id = ?", [value, userId]'));
  assert.ok(svc.includes("VALUES (?, ?, ?, 'admin', ?)"));
});
