/**
 * Game coins: earned by playing Ludo and from the daily spinner, spent in
 * the Ludo store (boards, sounds, dice, tokens, emoji, quick chat) or
 * swapped for a Spark or a Super Like.
 *
 * Coins only come from playing - they are never bought and never paid out.
 * Every coin in or out is a row in coin_ledger; a game or a day can pay
 * out only once (unique key on user, reason, ref).
 */
const crypto = require("crypto");
const { query } = require("../config/db");

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/** Everything in the store. Price 0 is free for everyone. */
const CATALOG = [
  // Boards
  { key: "theme.royal", kind: "theme", name: "Royal Night", price: 0 },
  { key: "theme.classic", kind: "theme", name: "Classic", price: 0 },
  { key: "theme.wood", kind: "theme", name: "Wooden", price: 300 },
  { key: "theme.ocean", kind: "theme", name: "Ocean", price: 500 },
  { key: "theme.neon", kind: "theme", name: "Neon", price: 800 },
  { key: "theme.diwali", kind: "theme", name: "Diwali", price: 1000 },
  // Sound packs
  { key: "sound.classic", kind: "sound", name: "Classic", price: 0 },
  { key: "sound.wood", kind: "sound", name: "Wooden board", price: 0 },
  { key: "sound.marble", kind: "sound", name: "Marble", price: 300 },
  { key: "sound.arcade", kind: "sound", name: "Arcade", price: 400 },
  { key: "sound.soft", kind: "sound", name: "Soft & calm", price: 400 },
  { key: "sound.bubbles", kind: "sound", name: "Bubbles", price: 600 },
  { key: "sound.dhol", kind: "sound", name: "Desi dhol", price: 700 },
  // Dice
  { key: "dice.classic", kind: "dice", name: "Classic", price: 0 },
  { key: "dice.gold", kind: "dice", name: "Gold", price: 500 },
  { key: "dice.ruby", kind: "dice", name: "Ruby", price: 600 },
  { key: "dice.emerald", kind: "dice", name: "Emerald", price: 600 },
  { key: "dice.galaxy", kind: "dice", name: "Galaxy", price: 1000 },
  // Tokens
  { key: "token.glossy", kind: "token", name: "Glossy", price: 0 },
  { key: "token.star", kind: "token", name: "Star", price: 400 },
  { key: "token.gem", kind: "token", name: "Gem", price: 600 },
  { key: "token.crown", kind: "token", name: "Crown", price: 900 },
  // Emoji to send in a game
  { key: "emoji.basic", kind: "emoji", name: "Basic", price: 0, items: ["😂", "👍", "😮", "😡", "🙏", "❤️"] },
  { key: "emoji.desi", kind: "emoji", name: "Desi", price: 400, items: ["🪔", "🙌", "🤦", "😎", "🔥", "💪"] },
  { key: "emoji.party", kind: "emoji", name: "Party", price: 600, items: ["🎉", "🥳", "🏆", "👑", "💥", "🎯"] },
  // Quick chat
  { key: "chat.basic", kind: "chat", name: "Basic", price: 0, items: ["Hi!", "Good luck!", "Nice move!", "Well played!"] },
  { key: "chat.fun", kind: "chat", name: "Fun", price: 300, items: ["Jaldi chalo! ⏰", "Bach ke rehna! 😈", "Ab dekho mera kamaal 😎", "Kismat achhi hai 🍀"] },
  { key: "chat.pro", kind: "chat", name: "Pro", price: 500, items: ["Ye game meri hai 🏆", "Sorry not sorry ✂️", "Ek aur game? 🎲", "GG! 🤝"] },
];
const BY_KEY = new Map(CATALOG.map((item) => [item.key, item]));

/** Coins swapped for app features. */
const EXCHANGE = { spark: { coins: 150, credit: "spark", label: "1 Spark" }, superlike: { coins: 400, credit: "superlike", label: "1 Super Like" } };

/** Levels by experience (every coin earned is one point). */
const LEVELS = [
  { name: "Bronze", from: 0 },
  { name: "Silver", from: 500 },
  { name: "Gold", from: 2000 },
  { name: "Diamond", from: 6000 },
];

function levelFor(xp) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (xp >= LEVELS[i].from) index = i;
  const next = LEVELS[index + 1] || null;
  return { level: LEVELS[index].name, levelFrom: LEVELS[index].from, nextLevel: next ? next.name : null, nextAt: next ? next.from : null };
}

/** Ludo pays: by place, a bonus for the day's first win and for wins in a row. */
const LUDO = { place: [50, 20, 10, 5], firstWin: 25, streakStep: 10, streakMax: 50, perDay: 10, minMoves: 30 };

/** The daily spinner's slices, as the wheel shows them (weight = how often). */
const SPIN_SLICES = [
  { label: "20", reward: { coins: 20 }, weight: 26 },
  { label: "50", reward: { coins: 50 }, weight: 22 },
  { label: "Spark", reward: { credit: "spark" }, weight: 10 },
  { label: "100", reward: { coins: 100 }, weight: 14 },
  { label: "30", reward: { coins: 30 }, weight: 14 },
  { label: "Mystery", reward: { unlock: true }, weight: 5 },
  { label: "200", reward: { coins: 200 }, weight: 7 },
  { label: "500", reward: { coins: 500 }, weight: 2 },
];
const SPIN_HOURS = 24;

const indianDay = (now = new Date()) => new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
function indianWeekStartUtc(now = new Date()) {
  const day = new Date(`${indianDay(now)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  // Midnight in India is 18:30 UTC the day before.
  return new Date(day.getTime() - 330 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

async function ensureWallet(userId) {
  await query("INSERT IGNORE INTO game_wallets (user_id) VALUES (?)", [userId]);
}

async function owned(userId) {
  const rows = await query("SELECT item_key FROM game_unlocks WHERE user_id = ?", [userId]);
  return new Set(rows.map((row) => row.item_key));
}

function isoUtc(value) {
  if (!value) return null;
  const text = String(value).replace(" ", "T");
  return new Date(/Z|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`).toISOString();
}

/** Coins, level, what is unlocked and when the spinner is ready. */
async function wallet(userId) {
  await ensureWallet(userId);
  const [row] = await query("SELECT * FROM game_wallets WHERE user_id = ?", [userId]);
  const mine = await owned(userId);
  const xp = Number(row.xp) || 0;
  const spunAt = row.spin_at ? new Date(isoUtc(row.spin_at)).getTime() : 0;
  const spinReadyAt = spunAt ? new Date(spunAt + SPIN_HOURS * 3600 * 1000) : new Date(0);
  return {
    coins: Number(row.coins) || 0,
    xp,
    ...levelFor(xp),
    wins: Number(row.wins) || 0,
    games: Number(row.games) || 0,
    streak: Number(row.streak) || 0,
    bestStreak: Number(row.best_streak) || 0,
    unlocked: CATALOG.filter((item) => item.price === 0 || mine.has(item.key)).map((item) => item.key),
    canSpin: spinReadyAt.getTime() <= Date.now(),
    spinReadyAt: spinReadyAt.toISOString(),
    catalog: CATALOG,
    exchange: EXCHANGE,
    spinSlices: SPIN_SLICES.map((slice) => slice.label),
  };
}

/**
 * Coins in (or out, when negative). With a ref, the same reason and ref
 * pays only once: returns false the second time.
 */
async function credit(userId, amount, reason, ref = null, stats = {}) {
  await ensureWallet(userId);
  const result = await query("INSERT IGNORE INTO coin_ledger (id, user_id, amount, reason, ref) VALUES (?, ?, ?, ?, ?)", [
    crypto.randomUUID(),
    userId,
    amount,
    reason,
    ref,
  ]);
  if (!result.affectedRows) return false;
  await query(
    `UPDATE game_wallets SET coins = coins + ?, xp = xp + ?, wins = wins + ?, games = games + ? WHERE user_id = ?`,
    [amount, Math.max(0, amount), stats.win ? 1 : 0, stats.game ? 1 : 0, userId],
  );
  return true;
}

/** Spend coins: only if there are enough (one statement, so two taps cannot both spend). */
async function spend(userId, price, reason, ref) {
  await ensureWallet(userId);
  const result = await query("UPDATE game_wallets SET coins = coins - ? WHERE user_id = ? AND coins >= ?", [price, userId, price]);
  if (!result.affectedRows) throw fail(402, "Not enough coins yet. Play and win to earn more!");
  await query("INSERT INTO coin_ledger (id, user_id, amount, reason, ref) VALUES (?, ?, ?, ?, ?)", [crypto.randomUUID(), userId, -price, reason, ref]);
}

async function unlock(userId, key) {
  const item = BY_KEY.get(String(key || ""));
  if (!item) throw fail(404, "That is not in the store.");
  if (item.price === 0 || (await owned(userId)).has(item.key)) return wallet(userId);
  await spend(userId, item.price, "unlock", item.key);
  await query("INSERT IGNORE INTO game_unlocks (user_id, item_key) VALUES (?, ?)", [userId, item.key]);
  return wallet(userId);
}

async function exchange(userId, what) {
  const deal = EXCHANGE[String(what || "")];
  if (!deal) throw fail(400, "Choose a Spark or a Super Like.");
  await spend(userId, deal.coins, "exchange", null);
  await require("./billingService").addCredits(userId, deal.credit, 1);
  return { ...(await wallet(userId)), got: deal.label };
}

function pickSlice(random = crypto.randomInt) {
  const total = SPIN_SLICES.reduce((sum, slice) => sum + slice.weight, 0);
  let roll = random(total);
  for (let i = 0; i < SPIN_SLICES.length; i += 1) {
    roll -= SPIN_SLICES[i].weight;
    if (roll < 0) return i;
  }
  return 0;
}

/** The daily spinner: once in 24 hours. */
async function spin(userId, random) {
  await ensureWallet(userId);
  const claim = await query(
    `UPDATE game_wallets SET spin_at = UTC_TIMESTAMP(6)
      WHERE user_id = ? AND (spin_at IS NULL OR spin_at <= UTC_TIMESTAMP(6) - INTERVAL ${SPIN_HOURS} HOUR)`,
    [userId],
  );
  if (!claim.affectedRows) throw fail(429, "Come back tomorrow for your next spin!");
  let index = pickSlice(random);
  let prize = null;
  const ref = indianDay();
  const { reward } = SPIN_SLICES[index];
  if (reward.unlock) {
    // Something locked, free. Everything already unlocked: 300 coins instead.
    const mine = await owned(userId);
    const locked = CATALOG.filter((item) => item.price > 0 && !mine.has(item.key));
    if (locked.length) {
      const item = locked[(random || crypto.randomInt)(locked.length)];
      await query("INSERT IGNORE INTO game_unlocks (user_id, item_key) VALUES (?, ?)", [userId, item.key]);
      prize = { kind: "unlock", key: item.key, name: item.name, itemKind: item.kind };
    } else {
      await credit(userId, 300, "spin", ref);
      prize = { kind: "coins", amount: 300 };
    }
  } else if (reward.credit) {
    await require("./billingService").addCredits(userId, reward.credit, 1);
    prize = { kind: "credit", credit: reward.credit, label: "1 Spark" };
  } else {
    await credit(userId, reward.coins, "spin", ref);
    prize = { kind: "coins", amount: reward.coins };
  }
  return { slice: index, prize, wallet: await wallet(userId) };
}

/**
 * A finished Ludo game pays its players, once. Only a real game pays: at
 * least two players, a game that went on (not over in a few moves), and
 * at most 10 paid games a day each. Leaving pays nothing and ends a streak.
 * Returns { userId: { coins, place, bonus } } for the results screen.
 */
async function rewardLudo(gameId, state) {
  const out = {};
  if (!state?.finished || state.players.length < 2 || (state.moveNo || 0) < LUDO.minMoves) return out;
  const day = indianDay();
  for (const player of state.players) {
    const userId = player.userId;
    if (player.out || !player.place) {
      await ensureWallet(userId);
      await query("UPDATE game_wallets SET streak = 0 WHERE user_id = ?", [userId]);
      continue;
    }
    const [{ n } = { n: 0 }] = await query(
      "SELECT COUNT(*) AS n FROM coin_ledger WHERE user_id = ? AND reason = 'ludo' AND created_at >= UTC_TIMESTAMP(6) - INTERVAL 1 DAY",
      [userId],
    );
    if (Number(n) >= LUDO.perDay) {
      out[userId] = { coins: 0, place: player.place, capped: true };
      continue;
    }
    const won = player.place === 1;
    const base = LUDO.place[Math.min(player.place, 4) - 1];
    const paid = await credit(userId, base, "ludo", gameId, { win: won, game: true });
    if (!paid) {
      // Paid before (the game was saved twice): report what it was.
      const [row] = await query("SELECT COALESCE(SUM(amount), 0) AS c FROM coin_ledger WHERE user_id = ? AND ref IN (?, ?)", [userId, gameId, `${gameId}:streak`]);
      out[userId] = { coins: Number(row?.c) || base, place: player.place };
      continue;
    }
    let bonus = 0;
    const notes = [];
    if (won) {
      await query("UPDATE game_wallets SET streak = streak + 1, best_streak = GREATEST(best_streak, streak + 1) WHERE user_id = ?", [userId]);
      if (await credit(userId, LUDO.firstWin, "first_win", day)) {
        bonus += LUDO.firstWin;
        notes.push(`First win today +${LUDO.firstWin}`);
      }
      const [w] = await query("SELECT streak FROM game_wallets WHERE user_id = ?", [userId]);
      const streak = Number(w?.streak) || 0;
      if (streak >= 2) {
        const extra = Math.min(LUDO.streakMax, (streak - 1) * LUDO.streakStep);
        if (await credit(userId, extra, "streak", `${gameId}:streak`)) {
          bonus += extra;
          notes.push(`${streak} wins in a row +${extra}`);
        }
      }
    } else {
      await query("UPDATE game_wallets SET streak = 0 WHERE user_id = ?", [userId]);
    }
    out[userId] = { coins: base + bonus, place: player.place, notes };
  }
  return out;
}

/** This week's top players among you and your matches (coins earned by playing). */
async function leaderboard(userId) {
  const since = indianWeekStartUtc();
  const rows = await query(
    `SELECT l.user_id, SUM(l.amount) AS coins, u.username,
            COALESCE(NULLIF(p.first_name, ''), u.username) AS name,
            (SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = l.user_id ORDER BY ph.position ASC LIMIT 1) AS photo
       FROM coin_ledger l
       JOIN users u ON u.id = l.user_id AND u.deleted_at IS NULL
       LEFT JOIN profiles p ON p.user_id = l.user_id
      WHERE l.reason IN ('ludo', 'first_win', 'streak') AND l.created_at >= ?
        AND (l.user_id = ? OR l.user_id IN (
              SELECT CASE WHEN m.user_a_id = ? THEN m.user_b_id ELSE m.user_a_id END
                FROM mutual_matches m WHERE m.user_a_id = ? OR m.user_b_id = ?))
      GROUP BY l.user_id, u.username, p.first_name
      ORDER BY coins DESC
      LIMIT 20`,
    [since, userId, userId, userId, userId],
  );
  return rows.map((row, i) => ({ rank: i + 1, userId: row.user_id, name: row.name || row.username, photo: row.photo || null, coins: Number(row.coins) || 0, me: row.user_id === userId }));
}

/** Can this player send this emoji or line in a game (an unlocked pack has it)? */
async function canSay(userId, kind, value) {
  const mine = await owned(userId);
  return CATALOG.some((item) => item.kind === kind && (item.price === 0 || mine.has(item.key)) && (item.items || []).includes(value));
}

module.exports = { CATALOG, EXCHANGE, LEVELS, LUDO, SPIN_SLICES, levelFor, pickSlice, wallet, credit, unlock, exchange, spin, rewardLudo, leaderboard, canSay, indianWeekStartUtc };
