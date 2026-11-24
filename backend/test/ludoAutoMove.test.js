const test = require("node:test");
const assert = require("node:assert");
const L = require("../src/services/ludoEngine.js");

// A roll of exactly `value` from the random source.
const dice = (value) => () => (value - 1) / 6 + 0.01;

test("when only one token can move, the roll moves it by itself", () => {
  const s = L.newGame([{ userId: "a", seat: 0 }, { userId: "b", seat: 2 }]);
  // Three tokens are still in the yard (a 6 is needed for them); the fourth is out on the track.
  s.players[0].tokens = [-1, -1, -1, 10];
  L.roll(s, "a", dice(3));
  assert.equal(s.players[0].tokens[3], 13, "the lone token moved by the dice");
  assert.equal(s.rolled, false, "nothing is left to tap");
  assert.equal(s.last.type, "move");
  assert.equal(s.turn, 1, "the turn passed to the next player");
});

test("when two tokens can move, the roll waits for a tap", () => {
  const s = L.newGame([{ userId: "a", seat: 0 }, { userId: "b", seat: 2 }]);
  s.players[0].tokens = [5, 10, -1, -1];
  L.roll(s, "a", dice(3));
  assert.equal(s.rolled, true);
  assert.deepEqual(s.movable, [0, 1]);
  assert.equal(s.players[0].tokens[0], 5, "no token moved yet");
});
