const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

/**
 * Find People's chips. "Active now" is online right now (the green dot's 45
 * seconds, hidden members left out) and "New" is the last 7 days. The filter
 * runs in the query, so a chip is not a slice of the top 20 deck.
 */
const service = readFileSync(require.resolve("../src/services/profileService.js"), "utf8");
const controller = readFileSync(require.resolve("../src/controllers/profileController.js"), "utf8");

test("active means online now, the same 45 seconds as the green dot", () => {
  assert.ok(service.includes("u.last_active_at > NOW(6) - INTERVAL 45 SECOND"));
  assert.ok(service.includes("COALESCE(u.hide_activity, 0) = 0"));
  assert.ok(service.includes("(SELECT COALESCE(me.hide_activity, 0) FROM users me WHERE me.id = ?) = 0"));
});

test("new means joined in the last 7 days", () => {
  assert.ok(service.includes("u.created_at > NOW(6) - INTERVAL 7 DAY"));
});

test("the filter is a whitelist, so any other value means all", () => {
  assert.ok(service.includes("Object.prototype.hasOwnProperty.call(DISCOVER_FILTERS, filter)"));
});

test("the controller passes the filter on to findMatches", () => {
  assert.ok(controller.includes('String(req.query.filter || "all")'));
});
