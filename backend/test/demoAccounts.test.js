/**
 * Demo accounts: an admin can make one for a store review and delete it later.
 * Delete must never touch an ordinary member, and the routes stay admin-only.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const userService = read("src/services/userService.js");
const routes = read("src/routes/adminRoutes.js");
const controller = read("src/controllers/adminController.js");
const migration = read("src/migrations/082_demo_accounts.sql");

test("the demo flag is a column on users, defaulting to off", () => {
  assert.match(migration, /ALTER TABLE users ADD COLUMN is_demo TINYINT\(1\) NOT NULL DEFAULT 0/);
});

test("deleting a demo account only ever matches is_demo = 1", () => {
  assert.match(userService, /async function deleteDemoUser[\s\S]*WHERE id = \? AND is_demo = 1/);
  assert.match(userService, /async function deleteDemoUser[\s\S]*DELETE FROM users WHERE id = \? AND is_demo = 1/);
});

test("a demo account is a real account with a username and password, no phone", () => {
  assert.match(userService, /async function createDemoUser[\s\S]*validateUsername[\s\S]*validatePassword[\s\S]*hashPassword/);
  assert.match(userService, /createUser\(\{\s*username: name,\s*passwordHash/);
});

test("the demo routes sit behind the admin gate", () => {
  const gate = routes.indexOf("router.use(requireAdmin);");
  assert.ok(gate > 0);
  for (const line of [
    'router.get("/demo-users", adminController.listDemoUsers);',
    'router.post("/demo-users", adminController.createDemoUser);',
    'router.delete("/demo-users/:id", adminController.deleteDemoUser);',
  ]) {
    const at = routes.indexOf(line);
    assert.ok(at > gate, `${line} must come after the admin gate`);
  }
  assert.match(controller, /const deleteDemoUser = asyncHandler/);
});
