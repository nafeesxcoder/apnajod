/**
 * A message is filed under the time the server receives it, so the newest
 * message is at the top of the chat list whatever the sender's phone clock says.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const service = fs.readFileSync(path.join(__dirname, "..", "src/services/chatService.js"), "utf8");

test("a new message takes the server's time, not the sender's", () => {
  assert.match(service, /const createdAtMs = Date\.now\(\);/);
  assert.doesNotMatch(service, /Number\(message\.createdAt\)/);
});

test("a resent message keeps its first time", () => {
  assert.match(service, /ON DUPLICATE KEY UPDATE payload = VALUES\(payload\)/);
});
