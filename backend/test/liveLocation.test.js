/**
 * Live location: the sharer moves the spot while it is live, only the sharer
 * can, and it stops for good when it is stopped or its time is up.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/chatService.js");
const routes = read("src/routes/chatRoutes.js");

test("only the sharer can move a live location, and only while it is live", () => {
  const body = service.slice(service.indexOf("async function updateLiveLocation"), service.indexOf("/** The sharer stops"));
  assert.match(body, /row\.sender_id !== userId \|\| row\.message_type !== "location"/);
  assert.match(body, /if \(!shared\?\.live\)/);
  assert.match(body, /Date\.now\(\) > Number\(shared\.expiresAt\)/);
  assert.match(body, /emitMessageUpdate\(peerId, updated, userId\)/);
});

test("the spot must be a real place on earth", () => {
  assert.match(service, /validCoordinate\(location\?\.latitude, 90\)/);
  assert.match(service, /validCoordinate\(location\?\.longitude, 180\)/);
});

test("stopping ends the share for both people", () => {
  const body = service.slice(service.indexOf("async function stopLiveLocation"), service.indexOf("const CLEARED_PAYLOAD"));
  assert.match(body, /live: false, expiresAt: Date\.now\(\)/);
  assert.match(body, /emitMessageUpdate\(peerId, updated, userId\)/);
});

test("the live location routes are there", () => {
  assert.match(routes, /router\.post\('\/:conversationId\/location\/:messageId\/live', chatController\.putLiveLocation\);/);
  assert.match(routes, /router\.post\('\/:conversationId\/location\/:messageId\/stop', chatController\.postStopLiveLocation\);/);
});
