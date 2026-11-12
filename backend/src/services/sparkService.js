const crypto = require("crypto");
const { query } = require("../config/db");
const { ApiError } = require("../middleware/errorHandler");
const pushService = require("./pushService");
const billingService = require("./billingService");

/**
 * Sparks and Super Likes - two ways to stand out to someone.
 *
 *   Spark       free. One a day for everyone, plus one more for each daily
 *               question answered (kept as 'spark' credits).
 *   Super Like  paid. Bought in packs on the Premium screen ('superlike'
 *               credits).
 *
 * Either one likes the person, puts the sender at the top of their Likes
 * with the note, and pings them. Neither counts against the free daily
 * like limit - the member is spending something to send it.
 *
 * Everything is decided here on the server. The app used to count the free
 * Spark on the phone, so reinstalling handed out another one.
 */
const SPARK = "spark";
const SUPERLIKE = "superlike";
const NOTE_MAX = 140;

function cleanNote(note) {
  if (typeof note !== "string") return null;
  const trimmed = note.trim().slice(0, NOTE_MAX);
  return trimmed || null;
}

/** Has this member already used today's free Spark (India time)? */
async function freeSparkUsedToday(userId, now = new Date()) {
  const [row] = await query(
    "SELECT 1 FROM match_sparks WHERE actor_id = ? AND free_day = ? LIMIT 1",
    [userId, billingService.indianDay(now)],
  );
  return !!row;
}

/** What this member can send right now. */
async function wallet(userId, now = new Date()) {
  const [freeUsed, sparks, superlikes] = await Promise.all([
    freeSparkUsedToday(userId, now),
    billingService.creditBalance(userId, SPARK),
    billingService.creditBalance(userId, SUPERLIKE),
  ]);
  return {
    freeSparkAvailable: !freeUsed,
    sparks,
    superlikes,
  };
}

function isDuplicate(error) {
  return error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
}

async function insertSpark({ actorId, targetId, kind, paidWith, freeDay, note }) {
  await query(
    `INSERT INTO match_sparks (id, actor_id, target_id, kind, paid_with, free_day, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), actorId, targetId, kind, paidWith, freeDay, note],
  );
}

/**
 * Pay for a Spark: today's free one if it is still there, else one earned
 * credit. The free one is claimed by the insert itself - the unique key on
 * (actor_id, free_day) refuses a second - so two taps at once cannot both
 * get it free.
 */
async function sendSparkPaid(actorId, targetId, note, now) {
  try {
    await insertSpark({
      actorId,
      targetId,
      kind: SPARK,
      paidWith: "free",
      freeDay: billingService.indianDay(now),
      note,
    });
    return "free";
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    // Either today's free Spark is gone, or this exact pair already has a
    // Spark (checked before we got here, so it is the free one).
  }
  if (!(await billingService.spendCredit(actorId, SPARK))) {
    throw new ApiError(
      402,
      "You have used today's free Spark. Answer today's question for one more, or come back tomorrow.",
    );
  }
  try {
    await insertSpark({ actorId, targetId, kind: SPARK, paidWith: "credit", freeDay: null, note });
  } catch (error) {
    // The credit was spent but nothing was sent - put it back.
    await billingService.addCredits(actorId, SPARK, 1);
    throw error;
  }
  return "credit";
}

async function sendSuperLikePaid(actorId, targetId, note) {
  if (!(await billingService.spendCredit(actorId, SUPERLIKE))) {
    throw new ApiError(402, "You have no Super Likes left. Get a pack from Premium.");
  }
  try {
    await insertSpark({ actorId, targetId, kind: SUPERLIKE, paidWith: "credit", freeDay: null, note });
  } catch (error) {
    await billingService.addCredits(actorId, SUPERLIKE, 1);
    throw error;
  }
  return "credit";
}

/**
 * Send a Spark or a Super Like.
 *
 * `recordDecision` is passed in rather than required, because
 * matchService already requires this file's neighbours and a cycle would
 * hand one of them an empty module.
 */
async function send(actorId, targetId, kind, rawNote, recordDecision, now = new Date()) {
  if (kind !== SPARK && kind !== SUPERLIKE) {
    throw new ApiError(400, 'kind must be "spark" or "superlike"');
  }
  if (!targetId) throw new ApiError(400, "targetId is required");
  if (targetId === actorId) throw new ApiError(400, "You cannot send that to yourself");

  // Check everything that could refuse BEFORE anything is spent.
  const [target] = await query(
    "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL AND deactivated_at IS NULL",
    [targetId],
  );
  if (!target) throw new ApiError(404, "That profile is no longer available");

  const [blocked] = await query(
    `SELECT 1 FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
      LIMIT 1`,
    [actorId, targetId, targetId, actorId],
  );
  if (blocked) throw new ApiError(404, "That profile is no longer available");

  const [already] = await query(
    "SELECT 1 FROM match_sparks WHERE actor_id = ? AND target_id = ? AND kind = ? LIMIT 1",
    [actorId, targetId, kind],
  );
  if (already) {
    throw new ApiError(
      409,
      kind === SPARK
        ? "You have already sent them a Spark."
        : "You have already sent them a Super Like.",
    );
  }

  const note = cleanNote(rawNote);
  const paidWith =
    kind === SPARK
      ? await sendSparkPaid(actorId, targetId, note, now)
      : await sendSuperLikePaid(actorId, targetId, note);

  // It is a like as well. Spending a Spark is the member's choice to stand
  // out, so the free daily like limit does not apply to it.
  const decision = await recordDecision(actorId, targetId, "interested", {
    skipLikeLimit: true,
  });

  const [actor] = await query("SELECT first_name FROM profiles WHERE user_id = ?", [actorId]);
  const name = actor?.first_name || "Someone";
  pushService
    .notifyUser(targetId, {
      title: kind === SPARK ? `${name} sent you a Spark ✨` : `${name} Super Liked you ⭐`,
      body: note || "Open Likes to see who it is.",
      data: { type: kind, userId: actorId },
    })
    .catch(() => undefined);

  return {
    ok: true,
    kind,
    paidWith,
    mutual: !!decision?.mutual,
    wallet: await wallet(actorId, now),
  };
}

module.exports = {
  SPARK,
  SUPERLIKE,
  NOTE_MAX,
  wallet,
  send,
  freeSparkUsedToday,
};
