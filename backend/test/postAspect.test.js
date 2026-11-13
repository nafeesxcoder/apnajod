/**
 * Posts keep the shape they were cropped to (square, portrait 4:5 or
 * landscape 1.91:1), like Instagram, and nothing else.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { cleanAspect, roundAspect, POST_ASPECTS } = require("../src/utils/postAspect");

test("only the three Instagram shapes are kept", () => {
  assert.deepEqual(POST_ASPECTS, [1, 0.8, 1.91]);
  assert.equal(cleanAspect(0.8), 0.8);
  assert.equal(cleanAspect("1.91"), 1.91);
  assert.equal(cleanAspect(1), 1);
});

test("anything else becomes square", () => {
  for (const bad of [undefined, null, "", "abc", 0, -1, 3, 0.5, Infinity]) {
    assert.equal(cleanAspect(bad), 1, String(bad));
  }
});

test("a FLOAT read back from MySQL comes out clean", () => {
  assert.equal(roundAspect(0.800000011920929), 0.8);
  assert.equal(roundAspect(1.909999966621399), 1.91);
  assert.equal(roundAspect(1), 1);
});

test("old posts default to square and the column is added safely", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../src/migrations/046_post_aspect_ratio.sql"), "utf8");
  assert.match(sql, /ALTER TABLE posts ADD COLUMN aspect_ratio FLOAT NOT NULL DEFAULT 1;/);
});

test("the controller passes the chosen shape through cleanAspect", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/controllers/postController.js"), "utf8");
  assert.match(source, /cleanAspect\(req\.body\.aspectRatio\)/);
});
