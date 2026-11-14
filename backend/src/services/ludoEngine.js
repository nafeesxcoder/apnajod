/**
 * Ludo rules, with nothing else in here: no database, no clock.
 *
 * Board: a 52-square track shared by everyone, then each colour's own
 * 5-square home column, then home. A token's place is its progress:
 *   -1        in the yard
 *   0 .. 50   on the track, counted from its own start square
 *   51 .. 55  in its home column
 *   56        home (done)
 *
 * Rules (the way most people play in India):
 * - A 6 brings a token out of the yard onto its start square.
 * - Rolling a 6, cutting someone, or getting a token home gives another roll.
 * - Three 6s in a row: the turn passes and that third 6 does not move.
 * - Landing on someone else's token on an unsafe square sends it back to
 *   their yard. Start squares and the starred squares are safe.
 * - Home needs the exact number.
 * - Finish all four and you are out of the game with your place; the game
 *   ends when only one player is left still playing.
 */

const TRACK = 52;
const HOME = 56;
const LAST_TRACK = 50;

/** Seat 0 red, 1 green, 2 yellow, 3 blue; each starts 13 squares after the last. */
const COLORS = ["red", "green", "yellow", "blue"];
const START = [0, 13, 26, 39];
/** Start squares and the four stars: nobody can be cut here. */
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/** Seats for 2, 3 or 4 players: two players sit across from each other. */
function seatsFor(count) {
  if (count === 2) return [0, 2];
  if (count === 3) return [0, 1, 2];
  return [0, 1, 2, 3];
}

/** Where a token is on the shared track (0-51), or null off the track. */
function trackSquare(seat, progress) {
  if (progress < 0 || progress > LAST_TRACK) return null;
  return (START[seat] + progress) % TRACK;
}

/**
 * A new game. players: [{ userId, seat }] in turn order.
 * `rng` returns 0..1 (Math.random in the app; fixed in tests).
 */
function newGame(players) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  return {
    players: ordered.map((p) => ({ userId: p.userId, seat: p.seat, color: COLORS[p.seat], tokens: [-1, -1, -1, -1], place: null, out: false, missed: 0 })),
    turn: 0,
    dice: null,
    rolled: false,
    sixes: 0,
    movable: [],
    winner: null,
    finished: false,
    places: [],
    last: null,
    moveNo: 0,
  };
}

const playing = (state) => state.players.filter((p) => !p.out && p.place === null);

function current(state) {
  return state.players[state.turn];
}

/** Tokens this player can move with this roll. */
function movableTokens(player, dice) {
  const list = [];
  player.tokens.forEach((progress, i) => {
    if (progress === -1) {
      if (dice === 6) list.push(i);
    } else if (progress < HOME && progress + dice <= HOME) {
      list.push(i);
    }
  });
  return list;
}

/** The next seat still playing after the current one. */
function advance(state) {
  if (playing(state).length <= 1) return;
  let next = state.turn;
  do {
    next = (next + 1) % state.players.length;
  } while (state.players[next].out || state.players[next].place !== null);
  state.turn = next;
  state.sixes = 0;
}

function endIfOver(state) {
  const left = playing(state);
  if (left.length <= 1 && !state.finished) {
    // The last one still playing takes the last place.
    if (left[0]) {
      left[0].place = state.places.length + 1;
      state.places.push(left[0].userId);
    }
    state.finished = true;
    state.winner = state.places[0] ?? null;
    state.dice = null;
    state.rolled = false;
    state.movable = [];
  }
}

/**
 * Roll for the player whose turn it is. Returns the new state; the value
 * comes from `rng`.
 */
function roll(state, userId, rng = Math.random) {
  if (state.finished) throw ruleError("The game is over.");
  const player = current(state);
  if (player.userId !== userId) throw ruleError("It is not your turn.");
  if (state.rolled) throw ruleError("Move a token first.");
  const dice = Math.floor(rng() * 6) + 1;
  state.dice = dice;
  state.moveNo += 1;
  state.last = { type: "roll", userId, dice };

  // Sixes in a row: a roll that is not a 6 starts the count again.
  state.sixes = dice === 6 ? state.sixes + 1 : 0;
  if (state.sixes === 3) {
    // Three 6s: the turn is lost.
    state.last = { type: "three_sixes", userId, dice };
    state.rolled = false;
    state.movable = [];
    advance(state);
    return state;
  }

  const movable = movableTokens(player, dice);
  if (!movable.length) {
    state.rolled = false;
    state.movable = [];
    state.last = { type: "no_move", userId, dice };
    advance(state);
    return state;
  }
  state.rolled = true;
  state.movable = movable;
  return state;
}

/** Move one token by the rolled number. */
function move(state, userId, token) {
  if (state.finished) throw ruleError("The game is over.");
  const player = current(state);
  if (player.userId !== userId) throw ruleError("It is not your turn.");
  if (!state.rolled) throw ruleError("Roll first.");
  if (!state.movable.includes(token)) throw ruleError("That token cannot move.");

  const dice = state.dice;
  const from = player.tokens[token];
  const to = from === -1 ? 0 : from + dice;
  player.tokens[token] = to;
  state.moveNo += 1;

  let bonus = dice === 6;
  const cut = [];
  const square = trackSquare(player.seat, to);
  if (square !== null && !SAFE.has(square)) {
    for (const other of state.players) {
      if (other === player || other.out) continue;
      other.tokens.forEach((progress, i) => {
        if (trackSquare(other.seat, progress) === square) {
          other.tokens[i] = -1;
          cut.push({ userId: other.userId, token: i });
        }
      });
    }
  }
  if (cut.length) bonus = true;
  if (to === HOME) bonus = true;

  state.last = { type: "move", userId, token, from, to, dice, cut };
  state.rolled = false;
  state.movable = [];
  state.dice = dice;

  if (player.tokens.every((p) => p === HOME)) {
    player.place = state.places.length + 1;
    state.places.push(player.userId);
    bonus = false;
  }
  endIfOver(state);
  if (state.finished) return state;
  if (bonus && player.place === null) {
    // Another roll for the same player (the three-6s count carries on).
    return state;
  }
  advance(state);
  return state;
}

/** A player leaves (or is removed after missing turns): their tokens go. */
function leave(state, userId) {
  const player = state.players.find((p) => p.userId === userId);
  if (!player || player.out || player.place !== null) return state;
  player.out = true;
  player.tokens = [-1, -1, -1, -1];
  const wasTurn = current(state) === player;
  state.last = { type: "left", userId };
  endIfOver(state);
  if (!state.finished && wasTurn) {
    state.rolled = false;
    state.movable = [];
    advance(state);
  }
  return state;
}

/**
 * The time ran out on someone's turn: roll for them, and move their first
 * movable token. Three missed turns in a row and they are out.
 */
function autoPlay(state, rng = Math.random) {
  if (state.finished) return state;
  const player = current(state);
  player.missed += 1;
  if (player.missed >= 3) return leave(state, player.userId);
  if (!state.rolled) roll(state, player.userId, rng);
  if (!state.finished && state.rolled && current(state) === player) move(state, player.userId, state.movable[0]);
  return state;
}

function ruleError(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

module.exports = {
  TRACK,
  HOME,
  COLORS,
  START,
  SAFE,
  seatsFor,
  trackSquare,
  newGame,
  movableTokens,
  roll,
  move,
  leave,
  autoPlay,
  current,
};
