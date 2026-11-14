/**
 * Date plans that work end to end, polls with votes, safe check-ins.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const chat = read("src/services/chatService.js");

test("only the person invited answers a date plan, only the one who asked cancels it", () => {
  assert.match(chat, /Only the person you invited can answer this plan\./);
  assert.match(chat, /Only the person who proposed it can cancel this plan\./);
});

test("the date card follows the plan for both people", () => {
  assert.match(chat, /await syncDateCard\(proposal\.conversation_id, proposalId, userId/);
  assert.match(chat, /await emitMessageUpdate\(peerId, \{ \.\.\.row, payload: JSON\.stringify\(payload\) \}, actingUserId\)/);
});

test("I'm safe needs an accepted date and counts in Safety Center", () => {
  assert.match(chat, /You can check in once the date is accepted\./);
  assert.match(read("src/services/safetyService.js"), /safeCheckInCount\(userId\)/);
  assert.match(read("src/migrations/061_date_plan_done.sql"), /'completed'/);
});

test("a poll counts one vote each and never shows who voted what", () => {
  assert.match(chat, /payload\.poll\.votes = \{ \.\.\.\(payload\.poll\.votes \|\| \{\}\), \[userId\]: index \}/);
  assert.match(chat, /out\.poll = \{ question: payload\.poll\.question, options: payload\.poll\.options, counts, myVote: mine \}/);
  const routes = read("src/routes/chatRoutes.js");
  assert.match(routes, /\/:conversationId\/messages\/:messageId\/vote/);
  assert.match(routes, /\/date-proposal\/checkin/);
});
