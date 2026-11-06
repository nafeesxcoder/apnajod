const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

/**
 * The deck shows everyone who has an account.
 *
 * findMatches used to cut the deck with three WHERE clauses: the member had
 * to have finished onboarding, had to sit inside an age range nobody had
 * chosen (21-45 by default), and had to match a gender preference. On an app
 * with a few hundred members that removes most of them, and the person
 * opening Home sees an empty deck and decides the app is dead.
 *
 * Preferences now order the deck instead of cutting it. What may still cut:
 * blocks, people already decided on, and accounts that are gone.
 */
const source = readFileSync(
  require.resolve("../src/services/profileService.js"),
  "utf8",
);

const body = source.slice(
  source.indexOf("async function findMatches"),
  source.indexOf("async function", source.indexOf("async function findMatches") + 10),
);

test("findMatches exists and was not renamed out from under this test", () => {
  assert.ok(body.length > 400, "findMatches body not found");
});

test("nobody is cut for having an unfinished profile", () => {
  assert.ok(
    !/AND\s+p\.onboarding_complete/.test(body),
    "onboarding_complete is a WHERE clause again, so half the members vanish",
  );
});

test("nobody is cut for their age or gender", () => {
  assert.ok(
    !/AND\s+p\.age\s+BETWEEN/.test(body),
    "age is a WHERE clause again",
  );
  assert.ok(
    !/AND\s+p\.gender\s*=/.test(body),
    "gender is a WHERE clause again",
  );
});

test("a member with no profile row is still in the deck", () => {
  assert.match(
    body,
    /LEFT JOIN profiles/,
    "an inner join hides anyone who has not started their profile",
  );
});

test("preferences order the deck rather than cutting it", () => {
  assert.match(body, /off_preference/);
  assert.match(body, /ORDER BY[\s\S]*off_preference ASC/);
});

test("private accounts are in the deck", () => {
  // Private decides who may message, not who may be seen.
  assert.ok(
    !/is_private/.test(body),
    "findMatches filters on is_private, so private members are invisible",
  );
});

test("blocks, past decisions and dead accounts still cut", () => {
  assert.match(body, /FROM blocks WHERE blocker_id/);
  assert.match(body, /FROM blocks WHERE blocked_id/);
  assert.match(body, /FROM match_decisions WHERE actor_id/);
  assert.match(body, /u\.deleted_at IS NULL/);
  assert.match(body, /u\.deactivated_at IS NULL/);
});
