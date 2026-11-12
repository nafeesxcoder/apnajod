/**
 * Chat games around the rules: only matched people play, only the two of
 * them can see a game, a stale move cannot overwrite a newer one, and the
 * chat gets a card at the start and the result at the end.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ||= "test-access-secret-value";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-value";

function load(stubs) {
  const resolved = require.resolve("../src/services/gameService");
  const from = path.dirname(resolved);
  const saved = new Map();
  for (const [id, exports] of Object.entries(stubs)) {
    const key = require.resolve(path.resolve(from, id));
    saved.set(key, require.cache[key]);
    require.cache[key] = { id: key, filename: key, loaded: true, exports };
  }
  delete require.cache[resolved];
  try {
    return require(resolved);
  } finally {
    for (const [key, entry] of saved) {
      if (entry) require.cache[key] = entry;
      else delete require.cache[key];
    }
    delete require.cache[resolved];
  }
}

function world({ matched = true, staleVersion = false } = {}) {
  const games = new Map();
  const messages = [];
  const query = async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT COUNT(*) AS n FROM chat_games")) return [{ n: 0 }];
    if (s.startsWith("INSERT INTO chat_games")) {
      const [id, conversation_id, kind, created_by, players, state] = params;
      games.set(id, { id, conversation_id, kind, created_by, players, state, status: "active", version: 0 });
      return { affectedRows: 1 };
    }
    if (s.startsWith("SELECT * FROM chat_games WHERE id")) {
      const row = games.get(params[0]);
      return row ? [{ ...row }] : [];
    }
    if (s.startsWith("UPDATE chat_games SET state")) {
      const [state, status, id, version] = params;
      const row = games.get(id);
      if (!row || staleVersion || row.version !== version) return { affectedRows: 0 };
      Object.assign(row, { state, status, version: row.version + 1 });
      return { affectedRows: 1 };
    }
    if (s.startsWith("SELECT first_name")) return [{ first_name: params[0] === "a" ? "Asha" : "Bilal" }];
    return [];
  };
  const service = load({
    "../config/db": { query },
    "./chatService": {
      storageKey: (x, y) => `dm:${[x, y].sort().join(":")}`,
      assertParticipant: async () => {
        if (!matched) throw Object.assign(new Error("no"), { status: 403 });
      },
      sendMessage: async (peerId, userId, message) => messages.push({ peerId, userId, message }),
    },
  });
  return { service, games, messages };
}

test("starting a game drops a card into the chat for the partner", async () => {
  const { service, messages } = world();
  const game = await service.start("a", "b", "tic_tac_toe");
  assert.equal(game.kind, "tic_tac_toe");
  assert.equal(game.yourTurn, true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].peerId, "b");
  assert.equal(messages[0].message.type, "game");
  assert.equal(messages[0].message.game.id, game.id);
  assert.equal(messages[0].message.game.result, null);
});

test("only a mutual match can start a game", async () => {
  const { service, messages } = world({ matched: false });
  await assert.rejects(() => service.start("a", "b", "this_or_that"), (e) => e.statusCode === 403);
  assert.equal(messages.length, 0);
});

test("nobody outside the two players can see or move", async () => {
  const { service } = world();
  const game = await service.start("a", "b", "tic_tac_toe");
  await assert.rejects(() => service.get(game.id, "stranger"), (e) => e.statusCode === 404);
  await assert.rejects(() => service.play(game.id, "stranger", { cell: 0 }), (e) => e.statusCode === 404);
});

test("rule errors come back as proper HTTP errors", async () => {
  const { service } = world();
  const game = await service.start("a", "b", "tic_tac_toe");
  await assert.rejects(() => service.play(game.id, "b", { cell: 0 }), (e) => e.statusCode === 409 && /turn/.test(e.message));
  await assert.rejects(() => service.start("a", "b", "ludo"), (e) => e.statusCode === 400);
});

test("a stale move never overwrites a newer one", async () => {
  const { service } = world({ staleVersion: true });
  const game = await service.start("a", "b", "tic_tac_toe");
  await assert.rejects(() => service.play(game.id, "a", { cell: 0 }), (e) => e.statusCode === 409 && /changed/.test(e.message));
});

test("finishing posts the result into the chat, from the one who finished", async () => {
  const { service, messages } = world();
  const game = await service.start("a", "b", "this_or_that");
  await service.play(game.id, "a", { picks: [0, 0, 0, 0, 0] });
  assert.equal(messages.length, 1, "no message until it is finished");
  const final = await service.play(game.id, "b", { picks: [0, 0, 0, 0, 1] });
  assert.equal(final.status, "done");
  assert.equal(final.matches, 4);
  assert.equal(messages.length, 2);
  assert.equal(messages[1].userId, "b");
  assert.equal(messages[1].peerId, "a");
  assert.match(messages[1].message.game.result, /^4\/5 the same/);
  await assert.rejects(() => service.play(game.id, "a", { picks: [1, 1, 1, 1, 1] }), (e) => e.statusCode === 409);
});
