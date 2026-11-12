const crypto = require("crypto");
const { query } = require("../config/db");
const { ApiError } = require("../middleware/errorHandler");
const chatService = require("./chatService");
const rules = require("./gameRules");

/**
 * Chat games: storing them, checking who may play, and dropping a card into
 * the chat when a game starts and when it ends. The rules themselves are in
 * gameRules.
 *
 * Only two people who can already message each other (a mutual match) can
 * play, and only the two of them can see or move in a game.
 */
const MAX_ACTIVE_PER_CHAT = 10;

function parseJson(raw, fallback) {
  if (raw && typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function canMessage(userId, peerId) {
  try {
    await chatService.assertParticipant(peerId, userId);
  } catch {
    throw new ApiError(403, "This chat is not available.");
  }
}

async function firstName(userId) {
  const [row] = await query("SELECT first_name FROM profiles WHERE user_id = ?", [userId]);
  return row?.first_name || "Your match";
}

function shape(row, viewerId) {
  const players = parseJson(row.players, []);
  const state = parseJson(row.state, {});
  const done = row.status === "done";
  const meta = rules.KINDS[row.kind] || { title: "Game", emoji: "🎮" };
  return {
    id: row.id,
    kind: row.kind,
    title: meta.title,
    emoji: meta.emoji,
    status: row.status,
    startedByMe: row.created_by === viewerId,
    version: Number(row.version) || 0,
    ...rules.view(row.kind, state, players, viewerId, done),
  };
}

async function load(gameId) {
  const [row] = await query("SELECT * FROM chat_games WHERE id = ?", [gameId]);
  if (!row) throw new ApiError(404, "Game not found");
  return row;
}

function toApiError(error) {
  if (error instanceof rules.GameError) return new ApiError(error.status, error.message);
  return error;
}

/** Start a game with the person this chat is with. */
async function start(userId, peerId, kind, setup) {
  await canMessage(userId, peerId);
  let state;
  try {
    state = rules.create(kind, userId, peerId, setup || {});
  } catch (error) {
    throw toApiError(error);
  }
  const conversationId = chatService.storageKey(userId, peerId);
  const [open] = await query(
    "SELECT COUNT(*) AS n FROM chat_games WHERE conversation_id = ? AND status = 'active'",
    [conversationId],
  );
  if (Number(open?.n) >= MAX_ACTIVE_PER_CHAT) {
    throw new ApiError(429, "Finish a few games in this chat before starting another.");
  }

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO chat_games (id, conversation_id, kind, created_by, players, state)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, conversationId, kind, userId, JSON.stringify([userId, peerId]), JSON.stringify(state)],
  );

  const meta = rules.KINDS[kind];
  await chatService.sendMessage(peerId, userId, {
    id: crypto.randomUUID(),
    type: "game",
    text: `${meta.emoji} Let's play ${meta.title}!`,
    game: { id, kind, title: meta.title, emoji: meta.emoji, result: null },
  });

  return shape(await load(id), userId);
}

async function forPlayer(gameId, userId) {
  const row = await load(gameId);
  const players = parseJson(row.players, []);
  if (!players.includes(userId)) throw new ApiError(404, "Game not found");
  const other = players.find((p) => p !== userId);
  await canMessage(userId, other);
  return { row, players, other };
}

async function get(gameId, userId) {
  const { row } = await forPlayer(gameId, userId);
  return shape(row, userId);
}

/** Make a move. When it finishes the game, the result goes into the chat. */
async function play(gameId, userId, input) {
  const { row, players, other } = await forPlayer(gameId, userId);
  if (row.status === "done") throw new ApiError(409, "This game is over");

  let result;
  try {
    result = rules.move(row.kind, parseJson(row.state, {}), players, userId, input || {});
  } catch (error) {
    throw toApiError(error);
  }

  const saved = await query(
    `UPDATE chat_games SET state = ?, status = ?, version = version + 1
      WHERE id = ? AND version = ?`,
    [JSON.stringify(result.state), result.done ? "done" : "active", gameId, row.version],
  );
  if ((saved?.affectedRows ?? 0) === 0) {
    throw new ApiError(409, "The game just changed. Take another look.");
  }

  if (result.done) {
    const meta = rules.KINDS[row.kind];
    const line = rules.resultText(row.kind, result.state, players, await firstName(userId));
    await chatService.sendMessage(other, userId, {
      id: crypto.randomUUID(),
      type: "game",
      text: `${meta.emoji} ${meta.title}: ${line}`,
      game: { id: gameId, kind: row.kind, title: meta.title, emoji: meta.emoji, result: line },
    });
  }

  return shape(await load(gameId), userId);
}

/** Questions for the know_me setup screen. */
function knowMeSetup() {
  return rules.knowMeQuestions();
}

module.exports = { MAX_ACTIVE_PER_CHAT, start, get, play, knowMeSetup, shape };
