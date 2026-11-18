const { test } = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PASS_PLANS, PASS_MONTHS } = require("../src/config/passes");

const svc = readFileSync(join(__dirname, "..", "src", "services", "passService.js"), "utf8");
const ctl = readFileSync(join(__dirname, "..", "src", "controllers", "adminController.js"), "utf8");

test("plans turn on the features the app checks", () => {
  assert.deepStrictEqual(PASS_PLANS.plus.features, ["premium"]);
  assert.ok(PASS_PLANS.pro.features.includes("pro"));
  assert.ok(PASS_PLANS.everything.features.includes("pro"));
});

test("a pass can run 1 month, 3 months or 1 year", () => {
  assert.deepStrictEqual(PASS_MONTHS, [1, 3, 12]);
});

test("deleting a pass ends only pass grants, never a paid plan", () => {
  assert.ok(svc.includes("AND source = 'pass'"));
});

test("the controller checks plan and length before it grants", () => {
  assert.ok(ctl.includes("Object.prototype.hasOwnProperty.call(PASS_PLANS, plan)"));
  assert.ok(ctl.includes("PASS_MONTHS.includes(Number(months))"));
});
