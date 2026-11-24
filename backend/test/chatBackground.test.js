/**
 * The chat background is a short id from the app's list. Anything else is dropped,
 * so a stored setting can never carry an arbitrary string.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { cleanBackground } = require("../src/services/chatService");

test("a valid background id is kept", () => {
  assert.equal(cleanBackground("rose-petals"), "rose-petals");
  assert.equal(cleanBackground("night-sky-2"), "night-sky-2");
});

test("anything else is dropped", () => {
  assert.equal(cleanBackground(""), undefined);
  assert.equal(cleanBackground("<script>"), undefined);
  assert.equal(cleanBackground("Rose Petals"), undefined);
  assert.equal(cleanBackground("x".repeat(33)), undefined);
  assert.equal(cleanBackground(42), undefined);
  assert.equal(cleanBackground(undefined), undefined);
});
