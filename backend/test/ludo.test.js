const test = require("node:test");
const assert = require("node:assert");
const L = require("../src/services/ludoEngine.js");

/** Dice that roll the given numbers in order. */
const dice = (...values) => {
  let i = 0;
  return () => (values[i++ % values.length] - 1) / 6 + 0.01;
};

const two = () => L.newGame([{ userId: "a", seat: 0 }, { userId: "b", seat: 2 }]);

test("seats: two players sit across, three and four fill round", () => {
  assert.deepStrictEqual(L.seatsFor(2), [0, 2]);
  assert.deepStrictEqual(L.seatsFor(3), [0, 1, 2]);
  assert.deepStrictEqual(L.seatsFor(4), [0, 1, 2, 3]);
});

test("only a 6 brings a token out; no move passes the turn", () => {
  const s = two();
  L.roll(s, "a", dice(3));
  assert.strictEqual(s.last.type, "no_move");
  assert.strictEqual(L.current(s).userId, "b");
  L.roll(s, "b", dice(6));
  assert.deepStrictEqual(s.movable, [0, 1, 2, 3]);
  L.move(s, "b", 0);
  assert.strictEqual(s.players[1].tokens[0], 0);
  assert.strictEqual(L.current(s).userId, "b", "a 6 gives another roll");
});

test("you cannot roll or move out of turn, or move before rolling", () => {
  const s = two();
  assert.throws(() => L.roll(s, "b", dice(6)), /not your turn/);
  assert.throws(() => L.move(s, "a", 0), /Roll first/);
});

test("landing on someone on an unsafe square sends them home and gives another roll", () => {
  const s = two();
  // b (yellow, starts at 26) sits on track square 30 = b's progress 4.
  s.players[1].tokens[0] = 4;
  // a (red, starts at 0) on progress 27 -> square 27; a 3 takes it to 30.
  s.players[0].tokens[0] = 27;
  L.roll(s, "a", dice(3));
  L.move(s, "a", 0);
  assert.strictEqual(s.players[1].tokens[0], -1);
  assert.deepStrictEqual(s.last.cut, [{ userId: "b", token: 0 }]);
  assert.strictEqual(L.current(s).userId, "a");
});

test("safe squares: no cutting on a star or a start square", () => {
  const s = two();
  s.players[1].tokens[0] = 8; // yellow progress 8 -> square 34, a star
  s.players[0].tokens[0] = 31;
  L.roll(s, "a", dice(3));
  L.move(s, "a", 0);
  assert.strictEqual(s.players[1].tokens[0], 8, "still there");
});

test("home needs the exact number, and getting home gives another roll", () => {
  const s = two();
  s.players[0].tokens = [53, -1, -1, -1];
  L.roll(s, "a", dice(5));
  assert.strictEqual(s.last.type, "no_move", "53 + 5 overshoots 56");
  L.roll(s, "b", dice(2));
  L.roll(s, "a", dice(3));
  L.move(s, "a", 0);
  assert.strictEqual(s.players[0].tokens[0], 56);
  assert.strictEqual(L.current(s).userId, "a");
});

test("three 6s in a row lose the turn", () => {
  const s = two();
  s.players[0].tokens = [10, -1, -1, -1];
  L.roll(s, "a", dice(6)); L.move(s, "a", 0);
  L.roll(s, "a", dice(6)); L.move(s, "a", 0);
  L.roll(s, "a", dice(6));
  assert.strictEqual(s.last.type, "three_sixes");
  assert.strictEqual(L.current(s).userId, "b");
  assert.strictEqual(s.players[0].tokens[0], 22, "the third 6 did not move");
});

test("finish all four and win; in a three-player game the rest play on", () => {
  const s = L.newGame([{ userId: "a", seat: 0 }, { userId: "b", seat: 1 }, { userId: "c", seat: 2 }]);
  s.players[0].tokens = [56, 56, 56, 55];
  L.roll(s, "a", dice(1));
  L.move(s, "a", 3);
  assert.strictEqual(s.players[0].place, 1);
  assert.strictEqual(s.finished, false);
  assert.strictEqual(L.current(s).userId, "b");
  s.players[1].tokens = [56, 56, 56, 54];
  L.roll(s, "b", dice(2));
  L.move(s, "b", 3);
  assert.strictEqual(s.finished, true);
  assert.deepStrictEqual(s.places, ["a", "b", "c"]);
  assert.strictEqual(s.winner, "a");
});

test("someone leaving: their tokens go, and with one left that player wins", () => {
  const s = two();
  s.players[0].tokens = [5, -1, -1, -1];
  L.leave(s, "a");
  assert.strictEqual(s.finished, true);
  assert.strictEqual(s.winner, "b");
});

test("time running out plays for them; three misses and they are out", () => {
  const s = two();
  L.autoPlay(s, dice(2));
  assert.strictEqual(L.current(s).userId, "b");
  L.autoPlay(s, dice(2));
  s.players[0].missed = 2;
  L.autoPlay(s, dice(2));
  assert.strictEqual(s.players[0].out, true);
  assert.strictEqual(s.winner, "b");
});

test("a whole random game always ends with a winner", () => {
  for (let g = 0; g < 30; g += 1) {
    const s = L.newGame([{ userId: "a", seat: 0 }, { userId: "b", seat: 1 }, { userId: "c", seat: 2 }, { userId: "d", seat: 3 }]);
    let guard = 0;
    while (!s.finished && guard < 5000) {
      const who = L.current(s).userId;
      L.roll(s, who);
      if (s.rolled) L.move(s, who, s.movable[Math.floor(Math.random() * s.movable.length)]);
      guard += 1;
    }
    assert.ok(s.finished, "finished");
    assert.strictEqual(s.places.length, 4);
  }
});
