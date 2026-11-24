/**
 * Deleting a pass code: it leaves the list and stops working, its name can be
 * used again, and the members who used it keep their pass.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/couponService.js");
const routes = read("src/routes/adminRoutes.js");
const migration = read("src/migrations/085_coupon_delete.sql");

test("the code table keeps deleted codes as a flag, not as rows that disappear", () => {
  assert.match(migration, /ALTER TABLE coupons ADD COLUMN deleted_at DATETIME NULL;/);
});

test("deleted codes leave the list and cannot be used", () => {
  assert.match(service, /FROM coupons c WHERE c\.deleted_at IS NULL ORDER BY c\.created_at DESC/);
  assert.match(service, /SELECT \* FROM coupons WHERE code = \? AND deleted_at IS NULL/);
  assert.match(service, /WHERE c\.pass_plan IS NOT NULL AND c\.active = 1 AND c\.deleted_at IS NULL/);
});

test("deleting renames the code, so its name can be used for a new code", () => {
  assert.match(service, /UPDATE coupons SET deleted_at = NOW\(\), active = 0, code = \? WHERE id = \?/);
  assert.match(service, /`\$\{row\.code\}-DEL-\$\{String\(row\.id\)\.slice\(0, 8\)\}`/);
});

test("deleting keeps the members' redemptions, so their passes stay", () => {
  assert.doesNotMatch(service, /DELETE FROM coupon_redemptions[\s\S]*async function remove/);
  const removeBody = service.slice(service.indexOf("async function remove"), service.indexOf("async function usable"));
  assert.doesNotMatch(removeBody, /coupon_redemptions/);
});

test("the delete route sits behind the admin gate", () => {
  const gate = routes.indexOf("router.use(requireAdmin);");
  assert.ok(gate > 0);
  assert.ok(routes.indexOf('router.delete("/coupons/:id", adminController.deleteCoupon);') > gate);
});
