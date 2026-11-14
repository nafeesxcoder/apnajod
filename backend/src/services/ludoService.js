/**
 * Ludo rooms for 2 to 4 players.
 *
 * - The host picks how many can play and invites people they can already
 *   chat with (a match or someone they message). Strangers cannot get in.
 * - Once at least two have joined, the host starts. The dice are rolled
 *   here on the server and every move is checked, so nobody can cheat
 *   from the app.
 * - Each turn has 30 seconds. When the time runs out the server plays for
 *   that player; three missed turns in a row and they are out.
 * - Everyone in the room gets each change at once ("ludo:update").
 *
 * The rules themselves are in ludoEngine.
 */
const crypto = require("crypto");
const { query } = require("../config/db");
const engine = require("./ludoEngine");
const realtime = require("./realtime");
const pushService = require("./pushService");
const chatService = require("./chatService");

const TURN_SECONDS = 30;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseJson(raw, fallback) {
  if (raw && typeof raw === "object") return raw;
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function isoUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(/Z|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`).toISOString();
}

const sqlUtc = (date) => date.toISOString().slice(0, 19).replace("T", " ");

async function loadGame(gameId) {
  const [game] = await query("SELECT * FROM ludo_games WHERE id = ?", [gameId]);
  if (!game) throw fail(404, "This game is not here any more.");
  return game;
}

async function membersOf(gameId) {
  return query(
    `SELECT m.user_id, m.status, m.joined_at, m.created_at, p.first_name, u.username,
            (SELECT photo_url FROM profile_photos ph WHERE ph.user_id = m.user_id ORDER BY ph.position ASC LIMIT 1) AS photo
       FROM ludo_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN profiles p ON p.user_id = m.user_id
      WHERE m.game_id = ?
      ORDER BY m.joined_at IS NULL, m.joined_at ASC, m.created_at ASC`,
    [gameId],
  );
}

/** What the app gets: the room, who is in it, and the board. */
function shape(game, members, viewerId) {
  const state = parseJson(game.state, null);
  const seatOf = {};
  if (state) for (const p of state.players) seatOf[p.userId] = p;
  return {
    id: game.id,
    hostId: game.host_id,
    isHost: game.host_id === viewerId,
    maxPlayers: Number(game.max_players),
    status: game.status,
    version: Number(game.version),
    turnDeadline: game.status === "playing" ? isoUtc(game.turn_deadline) : null,
    turnSeconds: TURN_SECONDS,
    members: members.map((m) => ({
      userId: m.user_id,
      name: m.first_name || m.username || "Member",
      photo: m.photo || null,
      status: m.status,
      seat: seatOf[m.user_id]?.seat ?? null,
      color: seatOf[m.user_id]?.color ?? null,
    })),
    state: state
      ? {
          players: state.players.map((p) => ({ userId: p.userId, seat: p.seat, color: p.color, tokens: p.tokens, place: p.place, out: p.out })),
          turnUserId: state.finished ? null : state.players[state.turn]?.userId ?? null,
          dice: state.dice,
          rolled: state.rolled,
          movable: state.movable,
          last: state.last,
          places: state.places,
          winner: state.winner,
          finished: state.finished,
          moveNo: state.moveNo,
        }
      : null,
  };
}

async function view(gameId, viewerId) {
  const game = await loadGame(gameId);
  return shape(game, await membersOf(gameId), viewerId);
}

/** Tell everyone in the room (invited people too, so their lobby updates). */
async function announce(gameId) {
  const game = await loadGame(gameId);
  const members = await membersOf(gameId);
  for (const m of members) {
    if (m.status === "declined") continue;
    realtime.emitToUser(m.user_id, "ludo:update", shape(game, members, m.user_id));
  }
}

async function assertCanInvite(hostId, userId) {
  if (userId === hostId) throw fail(400, "You are already in the game.");
  try {
    await chatService.assertParticipant(userId, hostId);
  } catch {
    throw fail(403, "You can invite people you can chat with.");
  }
}

async function firstName(userId) {
  const [row] = await query("SELECT first_name, (SELECT username FROM users WHERE id = ?) AS username FROM profiles WHERE user_id = ?", [userId, userId]);
  return row?.first_name || row?.username || "Someone";
}

async function sendInvites(gameId, hostId, userIds) {
  const name = await firstName(hostId);
  for (const userId of userIds) {
    await query(
      `INSERT INTO ludo_members (game_id, user_id, status, invited_by) VALUES (?, ?, 'invited', ?)
       ON DUPLICATE KEY UPDATE status = IF(status IN ('left','declined'), 'invited', status), invited_by = VALUES(invited_by)`,
      [gameId, userId, hostId],
    );
    pushService
      .notifyUser(userId, {
        title: `${name} invited you to Ludo 🎲`,
        body: "Join the game - you can talk while you play.",
        ludoGameId: gameId,
      })
      .catch(() => undefined);
  }
}

async function create(hostId, input) {
  const maxPlayers = Math.round(Number(input?.maxPlayers));
  if (!(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS)) throw fail(400, "Ludo is for 2, 3 or 4 players.");
  const invite = [...new Set((Array.isArray(input?.invite) ? input.invite : []).map(String))];
  if (invite.length > maxPlayers - 1) throw fail(400, `Invite up to ${maxPlayers - 1} people for a ${maxPlayers}-player game.`);
  for (const userId of invite) await assertCanInvite(hostId, userId);

  const id = crypto.randomUUID();
  await query("INSERT INTO ludo_games (id, host_id, max_players, status) VALUES (?, ?, ?, 'waiting')", [id, hostId, maxPlayers]);
  await query(
    "INSERT INTO ludo_members (game_id, user_id, status, joined_at) VALUES (?, ?, 'joined', UTC_TIMESTAMP())",
    [id, hostId],
  );
  await sendInvites(id, hostId, invite);
  await announce(id);
  return view(id, hostId);
}

async function invite(hostId, gameId, userIds) {
  const game = await loadGame(gameId);
  if (game.host_id !== hostId) throw fail(403, "Only the host can invite.");
  if (game.status !== "waiting") throw fail(409, "The game has started.");
  const list = [...new Set((Array.isArray(userIds) ? userIds : []).map(String))];
  const members = await membersOf(gameId);
  const taken = members.filter((m) => m.status === "joined" || m.status === "invited").length;
  if (taken + list.filter((id) => !members.some((m) => m.user_id === id && ["joined", "invited"].includes(m.status))).length > Number(game.max_players)) {
    throw fail(400, "That is more people than this game has seats for.");
  }
  for (const userId of list) await assertCanInvite(hostId, userId);
  await sendInvites(gameId, hostId, list);
  await announce(gameId);
  return view(gameId, hostId);
}

async function memberRow(gameId, userId) {
  const [row] = await query("SELECT * FROM ludo_members WHERE game_id = ? AND user_id = ?", [gameId, userId]);
  return row || null;
}

async function join(userId, gameId) {
  const game = await loadGame(gameId);
  const member = await memberRow(gameId, userId);
  if (!member || member.status === "declined") throw fail(403, "You were not invited to this game.");
  if (member.status === "joined") return view(gameId, userId);
  if (game.status !== "waiting") throw fail(409, "This game has already started.");
  const [count] = await query("SELECT COUNT(*) AS total FROM ludo_members WHERE game_id = ? AND status = 'joined'", [gameId]);
  if (Number(count?.total ?? 0) >= Number(game.max_players)) throw fail(409, "This game is full.");
  await query("UPDATE ludo_members SET status = 'joined', joined_at = UTC_TIMESTAMP() WHERE game_id = ? AND user_id = ?", [gameId, userId]);
  await announce(gameId);
  return view(gameId, userId);
}

async function decline(userId, gameId) {
  const member = await memberRow(gameId, userId);
  if (!member) throw fail(404, "No invite to decline.");
  await query("UPDATE ludo_members SET status = 'declined' WHERE game_id = ? AND user_id = ? AND status = 'invited'", [gameId, userId]);
  await announce(gameId);
  return { declined: true };
}

/** Save a new state if nobody changed the game meanwhile (version check). */
async function save(game, state, extra = {}) {
  const finished = state.finished;
  const deadline = finished ? null : sqlUtc(new Date(Date.now() + TURN_SECONDS * 1000));
  const result = await query(
    `UPDATE ludo_games SET state = ?, status = ?, turn_deadline = ?, version = version + 1
      WHERE id = ? AND version = ?`,
    [JSON.stringify(state), extra.status ?? (finished ? "finished" : "playing"), deadline, game.id, game.version],
  );
  if ((result?.affectedRows ?? 0) === 0) throw fail(409, "The game moved on. Try again.");
  schedule(game.id, finished ? null : Date.now() + TURN_SECONDS * 1000);
}

async function start(hostId, gameId) {
  const game = await loadGame(gameId);
  if (game.host_id !== hostId) throw fail(403, "Only the host can start.");
  if (game.status !== "waiting") throw fail(409, "The game has already started.");
  const joined = (await membersOf(gameId)).filter((m) => m.status === "joined");
  if (joined.length < MIN_PLAYERS) throw fail(409, "Wait for at least one more player to join.");
  const players = joined.slice(0, Number(game.max_players));
  const seats = engine.seatsFor(players.length);
  const state = engine.newGame(players.map((m, i) => ({ userId: m.user_id, seat: seats[i] })));
  // Invites nobody answered fall away once the game starts.
  await query("UPDATE ludo_members SET status = 'declined' WHERE game_id = ? AND status = 'invited'", [gameId]);
  await save(game, state, { status: "playing" });
  await announce(gameId);
  return view(gameId, hostId);
}

/** If the turn's time ran out, play for them first (also covers a restart). */
async function catchUp(game) {
  if (game.status !== "playing" || !game.turn_deadline) return game;
  let current = game;
  let guard = 0;
  while (current.status === "playing" && current.turn_deadline && new Date(isoUtc(current.turn_deadline)) <= new Date() && guard < 12) {
    const state = parseJson(current.state, null);
    if (!state) break;
    engine.autoPlay(state);
    await save(current, state);
    current = await loadGame(game.id);
    guard += 1;
  }
  if (guard) await announce(game.id);
  return current;
}

async function act(userId, gameId, apply) {
  let game = await loadGame(gameId);
  game = await catchUp(game);
  if (game.status !== "playing") throw fail(409, "The game is not on.");
  const state = parseJson(game.state, null);
  const me = state.players.find((p) => p.userId === userId);
  if (!me) throw fail(403, "You are not playing in this game.");
  apply(state);
  me.missed = 0;
  await save(game, state);
  await announce(gameId);
  return view(gameId, userId);
}

const roll = (userId, gameId) => act(userId, gameId, (state) => engine.roll(state, userId));
const move = (userId, gameId, token) =>
  act(userId, gameId, (state) => engine.move(state, userId, Math.round(Number(token))));

async function leave(userId, gameId) {
  const game = await loadGame(gameId);
  const member = await memberRow(gameId, userId);
  if (!member) throw fail(404, "You are not in this game.");
  await query("UPDATE ludo_members SET status = 'left' WHERE game_id = ? AND user_id = ?", [gameId, userId]);
  if (game.status === "waiting") {
    // The host leaving before it starts closes the room.
    if (game.host_id === userId) await query("UPDATE ludo_games SET status = 'cancelled' WHERE id = ?", [gameId]);
  } else if (game.status === "playing") {
    const state = parseJson(game.state, null);
    engine.leave(state, userId);
    await save(game, state);
  }
  await announce(gameId);
  return { left: true };
}

/** My invites, rooms waiting to start, games on, and games that just ended. */
async function mine(userId) {
  // Rooms nobody started within a day close by themselves.
  await query(
    "UPDATE ludo_games SET status = 'cancelled' WHERE status = 'waiting' AND created_at < UTC_TIMESTAMP() - INTERVAL 1 DAY",
  );
  const games = await query(
    `SELECT g.* FROM ludo_games g
       JOIN ludo_members m ON m.game_id = g.id AND m.user_id = ? AND m.status IN ('invited','joined')
      WHERE g.status IN ('waiting','playing')
         OR (g.status = 'finished' AND g.updated_at > UTC_TIMESTAMP() - INTERVAL 1 DAY)
      ORDER BY g.updated_at DESC LIMIT 20`,
    [userId],
  );
  const out = [];
  for (const g of games) {
    const fresh = await catchUp(g);
    out.push(shape(fresh, await membersOf(g.id), userId));
  }
  return out;
}

async function get(userId, gameId) {
  const member = await memberRow(gameId, userId);
  if (!member) throw fail(403, "You are not in this game.");
  const game = await catchUp(await loadGame(gameId));
  return shape(game, await membersOf(gameId), userId);
}

/** In the room (joined and not gone) - for the live voice. */
async function isPlayer(userId, gameId) {
  const [row] = await query(
    `SELECT 1 FROM ludo_members m JOIN ludo_games g ON g.id = m.game_id
      WHERE m.game_id = ? AND m.user_id = ? AND m.status = 'joined' AND g.status IN ('waiting','playing') LIMIT 1`,
    [gameId, userId],
  );
  return !!row;
}

async function playerIds(gameId) {
  const rows = await query("SELECT user_id FROM ludo_members WHERE game_id = ? AND status = 'joined'", [gameId]);
  return rows.map((r) => r.user_id);
}

// --- Turn timers -------------------------------------------------------
const timers = new Map();

function schedule(gameId, at) {
  clearTimeout(timers.get(gameId));
  timers.delete(gameId);
  if (!at) return;
  const timer = setTimeout(() => {
    timers.delete(gameId);
    loadGame(gameId)
      .then(catchUp)
      .catch(() => undefined);
  }, Math.max(0, at - Date.now()) + 300);
  if (timer.unref) timer.unref();
  timers.set(gameId, timer);
}

/** After a restart: pick up the clocks of games that are on. */
async function resumeTimers() {
  const games = await query("SELECT id, turn_deadline FROM ludo_games WHERE status = 'playing'");
  for (const g of games) {
    const at = g.turn_deadline ? new Date(isoUtc(g.turn_deadline)).getTime() : Date.now();
    schedule(g.id, at);
  }
}

module.exports = {
  TURN_SECONDS,
  create,
  invite,
  join,
  decline,
  start,
  roll,
  move,
  leave,
  mine,
  get,
  isPlayer,
  playerIds,
  resumeTimers,
  shape,
};
