/**
 * Chat game rules, move by move. Nothing here touches a database.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const rules = require("../src/services/gameRules");

const A = "alice";
const B = "bob";
const P = [A, B];
const fixed = () => 0; // always the first item

function expectError(fn, status, pattern) {
  assert.throws(fn, (e) => e instanceof rules.GameError && e.status === status && (!pattern || pattern.test(e.message)));
}

/* ---------- This or That / Would you rather ---------- */

test("this or that: 5 pairs, answers hidden until both are in, then matches shown", () => {
  let state = rules.create("this_or_that", A, B, {}, fixed);
  assert.equal(state.pairs.length, 5);

  let r = rules.move("this_or_that", state, P, A, { picks: [0, 1, 0, 1, 0] });
  assert.equal(r.done, false);
  state = r.state;
  const bobSees = rules.view("this_or_that", state, P, B, false);
  assert.equal(bobSees.partnerDone, true);
  assert.equal(bobSees.partnerPicks, null, "no copying before answering");
  assert.equal(bobSees.myPicks, null);

  r = rules.move("this_or_that", state, P, B, { picks: [0, 1, 1, 1, 0] });
  assert.equal(r.done, true);
  const aliceSees = rules.view("this_or_that", r.state, P, A, true);
  assert.deepEqual(aliceSees.partnerPicks, [0, 1, 1, 1, 0]);
  assert.equal(aliceSees.matches, 4);
  assert.match(rules.resultText("this_or_that", r.state, P, "Bob"), /^4\/5 the same/);
});

test("this or that: one answer each, complete and in range", () => {
  const state = rules.create("this_or_that", A, B, {}, fixed);
  expectError(() => rules.move("this_or_that", state, P, A, { picks: [0, 1] }), 400);
  expectError(() => rules.move("this_or_that", state, P, A, { picks: [0, 1, 2, 0, 0] }), 400);
  const once = rules.move("this_or_that", state, P, A, { picks: [0, 0, 0, 0, 0] }).state;
  expectError(() => rules.move("this_or_that", once, P, A, { picks: [1, 1, 1, 1, 1] }), 409);
  expectError(() => rules.move("this_or_that", state, P, "stranger", { picks: [0, 0, 0, 0, 0] }), 403);
});

test("would you rather: three questions, same reveal", () => {
  const state = rules.create("would_you_rather", A, B, {}, fixed);
  assert.equal(state.pairs.length, 3);
  const s1 = rules.move("would_you_rather", state, P, A, { picks: [0, 0, 0] }).state;
  const r = rules.move("would_you_rather", s1, P, B, { picks: [1, 1, 1] });
  assert.equal(r.done, true);
  assert.match(rules.resultText("would_you_rather", r.state, P, "Bob"), /0\/3 the same\. Opposites attract/);
});

/* ---------- How well do you know me ---------- */

const setup = { questions: [0, 1, 2, 3, 4], answers: [0, 1, 2, 3, 0] };

test("know me: the starter answers first, the partner guesses, then both see the score", () => {
  const state = rules.create("know_me", A, B, setup);
  const guesserBefore = rules.view("know_me", state, P, B, false);
  assert.equal(guesserBefore.role, "guesser");
  assert.equal(guesserBefore.truth, null, "the real answers stay hidden until guessed");
  assert.deepEqual(rules.view("know_me", state, P, A, false).truth, setup.answers, "the subject sees their own");

  const r = rules.move("know_me", state, P, B, { guesses: [0, 1, 0, 3, 1] });
  assert.equal(r.done, true);
  const after = rules.view("know_me", r.state, P, B, true);
  assert.deepEqual(after.truth, setup.answers);
  assert.equal(after.score, 3);
  assert.equal(rules.resultText("know_me", r.state, P, "Bob"), "Bob got 3/5 right 🙂");
});

test("know me: needs 5 different questions and an answer for each", () => {
  expectError(() => rules.create("know_me", A, B, { questions: [0, 0, 1, 2, 3], answers: [0, 0, 0, 0, 0] }), 400);
  expectError(() => rules.create("know_me", A, B, { questions: [0, 1, 2, 3, 4], answers: [0, 0] }), 400);
  expectError(() => rules.create("know_me", A, B, { questions: [0, 1, 2, 3, 99], answers: [0, 0, 0, 0, 0] }), 400);
});

test("know me: the subject cannot guess their own answers, and the guesser guesses once", () => {
  const state = rules.create("know_me", A, B, setup);
  expectError(() => rules.move("know_me", state, P, A, { guesses: [0, 0, 0, 0, 0] }), 409);
  const once = rules.move("know_me", state, P, B, { guesses: [0, 0, 0, 0, 0] }).state;
  expectError(() => rules.move("know_me", once, P, B, { guesses: [1, 1, 1, 1, 1] }), 409);
});

test("know me: setup offers five different questions from the bank", () => {
  const qs = rules.knowMeQuestions();
  assert.equal(qs.length, 5);
  assert.equal(new Set(qs.map((q) => q.index)).size, 5);
  for (const q of qs) assert.equal(q.options.length, 4);
});

/* ---------- Tic-tac-toe ---------- */

function playTic(moves) {
  let state = rules.create("tic_tac_toe", A, B);
  let last;
  moves.forEach((cell, i) => {
    last = rules.move("tic_tac_toe", state, P, i % 2 === 0 ? A : B, { cell });
    state = last.state;
  });
  return last;
}

test("tic-tac-toe: X starts, turns alternate, a line wins", () => {
  const r = playTic([0, 3, 1, 4, 2]); // X takes the top row
  assert.equal(r.done, true);
  assert.equal(r.state.winner, "X");
  assert.deepEqual(r.state.line, [0, 1, 2]);
  const aliceView = rules.view("tic_tac_toe", r.state, P, A, true);
  assert.equal(aliceView.youWon, true);
  assert.equal(rules.view("tic_tac_toe", r.state, P, B, true).youWon, false);
  assert.equal(rules.resultText("tic_tac_toe", r.state, P, "Alice"), "Alice won 🏆");
});

test("tic-tac-toe: a full board with no line is a draw", () => {
  const r = playTic([0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(r.done, true);
  assert.equal(r.state.winner, "draw");
  assert.equal(rules.resultText("tic_tac_toe", r.state, P, "Alice"), "It's a draw 🤝");
});

test("tic-tac-toe: no moving out of turn, onto a taken square, or after the end", () => {
  const start = rules.create("tic_tac_toe", A, B);
  expectError(() => rules.move("tic_tac_toe", start, P, B, { cell: 0 }), 409, /turn/);
  const s1 = rules.move("tic_tac_toe", start, P, A, { cell: 4 }).state;
  expectError(() => rules.move("tic_tac_toe", s1, P, B, { cell: 4 }), 409, /taken/);
  expectError(() => rules.move("tic_tac_toe", s1, P, B, { cell: 9 }), 400);
  const over = playTic([0, 3, 1, 4, 2]).state;
  expectError(() => rules.move("tic_tac_toe", over, P, B, { cell: 8 }), 409, /over/);
  assert.equal(rules.view("tic_tac_toe", s1, P, B, false).yourTurn, true);
  assert.equal(rules.view("tic_tac_toe", s1, P, A, false).yourTurn, false);
});

test("an unknown game is refused", () => {
  expectError(() => rules.create("ludo", A, B), 400);
});
