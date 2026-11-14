/**
 * Chat settings the server keeps: list flags, mute that ends, silent chats, screenshots.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const { listFlags } = require("../src/services/chatService");
const chat = read("src/services/chatService.js");

test("pinned, archived until a newer message, muted until the time chosen", () => {
  assert.deepEqual(listFlags({ conversationPinned: true }, 10), { pinned: true, archived: false, muted: false });
  assert.equal(listFlags({ conversationArchived: true, archivedAt: 100 }, 50).archived, true);
  assert.equal(listFlags({ conversationArchived: true, archivedAt: 100 }, 150).archived, false);
  assert.equal(listFlags({ notificationMode: "muted" }, 1).muted, true);
  assert.equal(listFlags({ notificationMode: "muted", mutedUntil: Date.now() - 1000 }, 1).muted, false);
});

test("a mute that has run out lets notifications through again", () => {
  assert.match(chat, /if \(!until \|\| until > Date\.now\(\)\) return;/);
});

test("a chat set to Silent sends its notifications without a sound", () => {
  assert.match(chat, /silent = settings\.notificationSound === "Silent";/);
  assert.match(read("src/services/pushService.js"), /sound: extra\.silent \? null : "default"/);
});

test("a screenshot tells the other person unless they turned alerts off", () => {
  const fn = chat.slice(chat.indexOf("async function screenshotNotice"));
  assert.match(fn, /theirs\.screenshotAlerts === false/);
  assert.match(fn, /Took a screenshot of this chat/);
  assert.match(read("src/routes/chatRoutes.js"), /router\.post\('\/:conversationId\/screenshot'/);
});
