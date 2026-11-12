/**
 * The rules of the chat games, with no database in sight.
 *
 * Every function here takes a game's state and returns a new one, so the
 * whole of a game can be tested move by move. gameService does the storing
 * and the chat messages around it.
 *
 *   this_or_that      5 quick pairs. Both pick; answers stay hidden until
 *                     both are done, then the matches are shown.
 *   would_you_rather  Same idea, 3 bigger questions.
 *   know_me           The starter answers 5 questions about themself; the
 *                     partner guesses. The real answers stay hidden from the
 *                     guesser until they have guessed.
 *   tic_tac_toe       Classic 3x3. The starter is X and goes first.
 *
 * Nothing is bet or won - these are for fun and conversation only.
 */
const KINDS = {
  this_or_that: { title: "This or That", emoji: "🔀" },
  would_you_rather: { title: "Would you rather", emoji: "🤔" },
  know_me: { title: "How well do you know me", emoji: "🧠" },
  tic_tac_toe: { title: "Tic-tac-toe", emoji: "⭕" },
};

const THIS_OR_THAT = [
  ["Chai", "Coffee"],
  ["Mountains", "Beach"],
  ["Sweet", "Spicy"],
  ["Early bird", "Night owl"],
  ["Dogs", "Cats"],
  ["Texting", "Calling"],
  ["Biryani", "Pizza"],
  ["Road trip", "Flight"],
  ["Books", "Movies"],
  ["Monsoon", "Winter"],
  ["Cook at home", "Eat out"],
  ["City life", "Small town life"],
  ["Plan everything", "Go with the flow"],
  ["Sunrise", "Sunset"],
  ["Party", "Quiet night in"],
  ["Bollywood", "Hollywood"],
  ["Golgappe", "Momos"],
  ["Gym", "Long walk"],
  ["Movie at home", "Movie in a theatre"],
  ["Shopping", "Gaming"],
];

const WOULD_YOU_RATHER = [
  ["Travel the world for a year", "Get your dream house today"],
  ["Have a big fat wedding", "Have a small wedding with close family"],
  ["Live in your home town forever", "Live in a new city every year"],
  ["Only eat ghar ka khana forever", "Only eat restaurant food forever"],
  ["Give up your phone for a month", "Give up sweets for a year"],
  ["Be famous", "Be rich but unknown"],
  ["Plan surprise dates", "Be surprised on dates"],
  ["Speak every language", "Play every instrument"],
  ["Go back in time", "Visit the future"],
  ["Morning walks together", "Late night drives together"],
  ["Never argue again", "Always make up within an hour"],
  ["Have a house full of pets", "Have a house full of plants"],
];

const KNOW_ME = [
  { q: "My ideal weekend?", options: ["Sleep in", "Out with friends", "Family time", "A short trip"] },
  { q: "My comfort food?", options: ["Maggi", "Biryani", "Chole bhature", "Pizza"] },
  { q: "My pick for a first date?", options: ["Coffee", "Dinner", "A long walk", "A movie"] },
  { q: "My dream holiday?", options: ["Mountains", "Beach", "Abroad", "A spiritual trip"] },
  { q: "How do I handle stress?", options: ["Music", "Sleep", "Talk to someone", "Workout"] },
  { q: "My biggest fear?", options: ["Heights", "Being alone", "Failure", "Cockroaches"] },
  { q: "My love language?", options: ["Time together", "Kind words", "Gifts", "Helping out"] },
  { q: "Am I a morning or night person?", options: ["Early morning", "Late night", "Both", "Neither"] },
  { q: "With a big lottery win I would first...", options: ["Buy a house", "Travel", "Invest it", "Help my family"] },
  { q: "My favourite season?", options: ["Summer", "Monsoon", "Winter", "Spring"] },
];

const SIZES = { this_or_that: 5, would_you_rather: 3, know_me: 5 };
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

class GameError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** n distinct items from a list, using `random` so tests can fix it. */
function sample(list, n, random = Math.random) {
  const pool = list.slice();
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return out;
}

function isChoiceList(value, length, max) {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v < max)
  );
}

/**
 * A new game. `setup` is only used by know_me, where the starter gives
 * their own answers up front: { questions: [indexes into the bank],
 * answers: [chosen option per question] }.
 */
function create(kind, starterId, partnerId, setup = {}, random = Math.random) {
  if (!KINDS[kind]) throw new GameError(400, "Unknown game");
  if (kind === "this_or_that" || kind === "would_you_rather") {
    const bank = kind === "this_or_that" ? THIS_OR_THAT : WOULD_YOU_RATHER;
    return { pairs: sample(bank, SIZES[kind], random), picks: {} };
  }
  if (kind === "know_me") {
    const n = SIZES.know_me;
    const indexes = setup.questions;
    const valid =
      Array.isArray(indexes) &&
      indexes.length === n &&
      new Set(indexes).size === n &&
      indexes.every((i) => Number.isInteger(i) && i >= 0 && i < KNOW_ME.length);
    if (!valid) throw new GameError(400, "Pick 5 questions to answer");
    if (!isChoiceList(setup.answers, n, 4)) {
      throw new GameError(400, "Answer all 5 questions about yourself first");
    }
    return {
      subject: starterId,
      questions: indexes.map((i) => KNOW_ME[i]),
      truth: setup.answers.slice(),
      guesses: null,
    };
  }
  // tic_tac_toe
  return {
    board: Array(9).fill(null),
    x: starterId,
    o: partnerId,
    turn: starterId,
    winner: null,
    line: null,
  };
}

/** Five random question indexes for the know_me setup screen. */
function knowMeQuestions(random = Math.random) {
  return sample(
    KNOW_ME.map((_, i) => i),
    SIZES.know_me,
    random,
  ).map((i) => ({ index: i, ...KNOW_ME[i] }));
}

function matchesOf(state, a, b) {
  const pa = state.picks[a] || [];
  const pb = state.picks[b] || [];
  return pa.reduce((count, pick, i) => count + (pick === pb[i] ? 1 : 0), 0);
}

function ticWinner(board) {
  for (const line of LINES) {
    const [i, j, k] = line;
    if (board[i] && board[i] === board[j] && board[i] === board[k]) {
      return { winner: board[i], line };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: null };
  return { winner: null, line: null };
}

/**
 * Apply one player's move. Returns { state, done }.
 * `players` is [starterId, partnerId].
 */
function move(kind, state, players, playerId, input = {}) {
  if (!players.includes(playerId)) throw new GameError(403, "You are not in this game");
  const other = players.find((p) => p !== playerId);

  if (kind === "this_or_that" || kind === "would_you_rather") {
    const n = state.pairs.length;
    if (state.picks[playerId]) throw new GameError(409, "You have already answered");
    if (!isChoiceList(input.picks, n, 2)) throw new GameError(400, "Answer every question");
    const picks = { ...state.picks, [playerId]: input.picks.slice() };
    const next = { ...state, picks };
    return { state: next, done: !!picks[other] };
  }

  if (kind === "know_me") {
    if (playerId === state.subject) {
      throw new GameError(409, "These questions are about you - your partner guesses");
    }
    if (state.guesses) throw new GameError(409, "You have already guessed");
    if (!isChoiceList(input.guesses, state.questions.length, 4)) {
      throw new GameError(400, "Guess every question");
    }
    return { state: { ...state, guesses: input.guesses.slice() }, done: true };
  }

  // tic_tac_toe
  if (state.winner) throw new GameError(409, "This game is over");
  if (state.turn !== playerId) throw new GameError(409, "Wait for your turn");
  const cell = input.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) throw new GameError(400, "Pick a square");
  if (state.board[cell]) throw new GameError(409, "That square is taken");
  const board = state.board.slice();
  board[cell] = playerId === state.x ? "X" : "O";
  const { winner, line } = ticWinner(board);
  return {
    state: { ...state, board, winner, line, turn: winner ? null : other },
    done: !!winner,
  };
}

/** What one player is allowed to see. Hidden answers stay hidden. */
function view(kind, state, players, viewerId, done) {
  const partnerId = players.find((p) => p !== viewerId);

  if (kind === "this_or_that" || kind === "would_you_rather") {
    const mine = state.picks[viewerId] || null;
    const theirs = state.picks[partnerId] || null;
    return {
      pairs: state.pairs,
      myPicks: mine,
      partnerDone: !!theirs,
      // Only once both have answered, so nobody copies.
      partnerPicks: done ? theirs : null,
      matches: done ? matchesOf(state, viewerId, partnerId) : null,
    };
  }

  if (kind === "know_me") {
    const isSubject = viewerId === state.subject;
    const showTruth = isSubject || done;
    return {
      role: isSubject ? "subject" : "guesser",
      questions: state.questions,
      truth: showTruth ? state.truth : null,
      guesses: state.guesses,
      score: done
        ? state.truth.reduce((n, t, i) => n + (state.guesses[i] === t ? 1 : 0), 0)
        : null,
    };
  }

  return {
    board: state.board,
    mySymbol: viewerId === state.x ? "X" : "O",
    yourTurn: !state.winner && state.turn === viewerId,
    winner: state.winner,
    youWon: !!state.winner && state.winner !== "draw" && (viewerId === state.x ? "X" : "O") === state.winner,
    line: state.line,
  };
}

/**
 * The line that goes into the chat when a game finishes. `finisherName` is
 * whoever made the last move - in tic-tac-toe that is always the winner.
 */
function resultText(kind, state, players, finisherName) {
  const [starter, other] = players;
  if (kind === "this_or_that" || kind === "would_you_rather") {
    const n = state.pairs.length;
    const m = matchesOf(state, starter, other);
    const mood = m === n ? "Perfect match! 🎉" : m >= Math.ceil(n / 2) ? "Pretty similar 🙂" : "Opposites attract 😄";
    return `${m}/${n} the same. ${mood}`;
  }
  if (kind === "know_me") {
    const score = state.truth.reduce((n, t, i) => n + (state.guesses[i] === t ? 1 : 0), 0);
    return `${finisherName} got ${score}/${state.truth.length} right ${score >= 4 ? "🎉" : score >= 2 ? "🙂" : "😅"}`;
  }
  if (state.winner === "draw") return "It's a draw 🤝";
  return `${finisherName} won 🏆`;
}

module.exports = {
  KINDS,
  SIZES,
  THIS_OR_THAT,
  WOULD_YOU_RATHER,
  KNOW_ME,
  GameError,
  create,
  knowMeQuestions,
  move,
  view,
  resultText,
};
