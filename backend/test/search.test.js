const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");

/**
 * Search must find everybody.
 *
 * Username search filtered out private accounts while sign-up made every
 * account private, so the search returned nothing at all. On a dating app
 * that is the whole product: you cannot like somebody you cannot find.
 *
 * Privacy belongs where it is actually enforced - messaging needs a mutual
 * like - so being findable costs the member nothing.
 */
const source = readFileSync(
  require.resolve("../src/services/followService.js"),
  "utf8",
);

const searchBody = source.slice(
  source.indexOf("async function searchByUsername"),
  source.indexOf("async function matchContacts"),
);

test("username search does not hide private accounts", () => {
  assert.ok(
    searchBody.length > 100,
    "searchByUsername not found - did it get renamed?",
  );
  assert.ok(
    !/is_private\s*=\s*0/.test(searchBody),
    "searchByUsername filters on is_private, so private accounts are unfindable",
  );
});

test("username search still hides blocked and deleted accounts", () => {
  assert.match(searchBody, /deleted_at IS NULL/);
  assert.match(searchBody, /blocks/);
});
