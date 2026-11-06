const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");

/**
 * A like against somebody who is not a member must not be a 500.
 *
 * match_decisions.target_id has a foreign key onto users.id. When the client
 * sent an id that is not in users - a sample person leaking into a live deck,
 * a deleted account still sitting in somebody's open deck - MySQL raised
 * ER_NO_REFERENCED_ROW_2, the error handler turned it into a 500, and the app
 * showed its crash screen instead of "that profile is gone". Worse, the
 * reason was invisible: the log said foreign key, not which profile.
 *
 * So the target is checked first and a missing one is a plain 404.
 */
function loadMatchService({ users }) {
  const original = Module.prototype.require;
  const sqls = [];
  Module.prototype.require = function patched(id) {
    if (id === "../config/db") {
      return {
        query: async (sql, params) => {
          sqls.push(sql.trim());
          if (/^SELECT id FROM users/i.test(sql.trim())) {
            return users.includes(params[0]) ? [{ id: params[0] }] : [];
          }
          return [];
        },
      };
    }
    if (id === "./pushService") {
      return { notifyUser: async () => undefined };
    }
    return original.apply(this, arguments);
  };
  try {
    const resolved = require.resolve("../src/services/matchService");
    delete require.cache[resolved];
    return { service: require(resolved), sqls };
  } finally {
    Module.prototype.require = original;
  }
}

test("a like on a real member is recorded", async () => {
  const { service, sqls } = loadMatchService({ users: ["her"] });
  const result = await service.recordDecision("me", "her", "interested");
  assert.equal(result.ok, true);
  assert.ok(
    sqls.some((sql) => /INSERT INTO match_decisions/i.test(sql)),
    "the decision should be written",
  );
});

test("a like on an id that is not a member is a 404, not a 500", async () => {
  const { service, sqls } = loadMatchService({ users: ["her"] });
  await assert.rejects(
    () => service.recordDecision("me", "sample-person-3", "interested"),
    (error) => {
      // statusCode is what errorHandler reads; anything else falls to 500.
      assert.equal(
        error.statusCode,
        404,
        "a missing profile is not a server error",
      );
      assert.match(error.message, /no longer available/i);
      return true;
    },
  );
  assert.ok(
    !sqls.some((sql) => /INSERT INTO match_decisions/i.test(sql)),
    "nothing should reach the foreign key",
  );
});

test("the target is checked before anything is written", async () => {
  const { service, sqls } = loadMatchService({ users: ["her"] });
  await service.recordDecision("me", "her", "pass");
  const checked = sqls.findIndex((sql) => /^SELECT id FROM users/i.test(sql));
  const written = sqls.findIndex((sql) => /INSERT INTO match_decisions/i.test(sql));
  assert.ok(checked !== -1, "the target should be looked up");
  assert.ok(checked < written, "the lookup should come first");
});
