/**
 * Notifications for the phone app (Expo push), next to the website's web push.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/pushService.js");
const migration = read("src/migrations/055_device_push_tokens.sql");
const { isExpoToken, expoMessages } = require("../src/services/pushService");

test("only real Expo push tokens are saved", () => {
  assert.equal(isExpoToken("ExponentPushToken[abc123]"), true);
  assert.equal(isExpoToken("ExpoPushToken[xyz]"), true);
  assert.equal(isExpoToken("https://evil.example/endpoint"), false);
  assert.equal(isExpoToken(""), false);
});

test("a notification carries which chat or post it is about", () => {
  const [message] = expoMessages(["ExponentPushToken[a]"], { title: "Riya", body: "Hi", conversationId: "u1", data: { type: "reply" } });
  assert.equal(message.title, "Riya");
  assert.equal(message.body, "Hi");
  assert.deepEqual(message.data, { type: "reply", conversationId: "u1" });
  assert.equal(message.channelId, "default");
});

test("the phone app gets notifications even without the website's keys", () => {
  const notify = service.slice(service.indexOf("async function notifyUser"));
  assert.ok(notify.indexOf("await notifyDevices(userId, payload)") < notify.indexOf("VAPID keys are not set"));
});

test("a phone without the app is forgotten, and tokens go with the account", () => {
  assert.match(service, /DeviceNotRegistered/);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE CASCADE/);
  for (const line of migration.split("\n")) if (line.trim().startsWith("--")) assert.doesNotMatch(line, /;/);
});
