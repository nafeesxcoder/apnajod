/**
 * Replying to a story goes to chat as a normal message with a small label;
 * the story itself is never copied into the chat.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const chat = read("src/services/chatService.js");
const stories = read("src/services/storyService.js");

test("a story reply keeps only its label in chat", () => {
  assert.match(chat, /if \(payload\.storyReply\) payload\.storyReply = \{ reaction: !!payload\.storyReply\.reaction \};/);
});

test("the push says it was a reply or a reaction to your story", () => {
  assert.match(chat, /`Replied to your story: \$\{text\}`/);
  assert.match(chat, /`Reacted \$\{text\} to your story`/);
});

test("only matches can reply (chat is between matches)", () => {
  assert.match(stories, /person\.canReply = !person\.mine && matched\.has\(person\.user\.userId\)/);
});
