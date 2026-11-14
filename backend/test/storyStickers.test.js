/**
 * Poll, question and @mention stickers on stories - checked on the way in,
 * and deleted with the story after 24 hours.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const migration = read("src/migrations/054_story_stickers.sql");
const service = read("src/services/storyStickerService.js");
const stories = read("src/services/storyService.js");
const routes = read("src/routes/storyRoutes.js");
const { cleanStickers } = require("../src/services/storyStickerService");

test("only known stickers get through, with short texts and positions inside the story", () => {
  const out = cleanStickers(
    JSON.stringify([
      { id: "p1", kind: "poll", question: "Chai ya coffee?", options: ["Chai", "Coffee"], x: 3, y: -1, scale: 99 },
      { id: "p2", kind: "poll", question: "second", options: ["a", "b"] },
      { id: "q1", kind: "question", prompt: "  Ask   me anything  " },
      { id: "m1", kind: "mention", userId: "u-1", username: "rahul" },
      { id: "x1", kind: "script", code: "alert(1)" },
      { id: "bad", kind: "poll", options: ["only one"] },
      "nonsense",
    ]),
  );
  assert.deepEqual(out.map((s) => s.id), ["p1", "q1", "m1"]);
  assert.deepEqual([out[0].x, out[0].y, out[0].scale], [1, 0, 5]);
  assert.equal(out[1].prompt, "Ask me anything");
  assert.deepEqual(cleanStickers("{not json"), []);
});

test("at most five mentions on one story", () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, kind: "mention", userId: `u${i}`, username: `user${i}` }));
  assert.equal(cleanStickers(many).length, 5);
});

test("votes, answers and mentions are deleted with the story's row", () => {
  for (const table of ["story_votes", "story_answers", "story_mentions"]) {
    const block = migration.slice(migration.indexOf(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(block.slice(0, block.indexOf(") ENGINE")), /REFERENCES stories\(id\) ON DELETE CASCADE/);
  }
  for (const line of migration.split("\n")) if (line.trim().startsWith("--")) assert.doesNotMatch(line, /;/);
});

test("someone mentioned can see that one story, even on a private account", () => {
  // One shared rule for the tray and for voting, answering and liking.
  const visibility = fs.readFileSync(path.join(__dirname, "..", "src/services/storyVisibility.js"), "utf8");
  assert.match(visibility, /OR EXISTS \(SELECT 1 FROM story_mentions sm WHERE sm\.story_id = s\.id AND sm\.user_id = \?\)/);
  assert.match(stories, /AND \$\{VISIBLE_TO_VIEWER\}/);
  assert.match(service, /AND \$\{VISIBLE_TO_VIEWER\}/);
});

test("one vote each, not on your own poll, and only the owner sees who voted", () => {
  assert.match(service, /INSERT IGNORE INTO story_votes/);
  assert.match(service, /You cannot vote on your own poll/);
  assert.match(service, /SELECT id FROM stories WHERE id = \? AND user_id = \? AND expires_at > NOW\(6\)/);
});

test("answers are capped and rate-limited", () => {
  assert.match(service, /MAX_ANSWERS_EACH = 5/);
  assert.match(routes, /router\.post\('\/:id\/answer', answerLimiter/);
});
