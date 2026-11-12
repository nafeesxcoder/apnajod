const { query } = require("../config/db");
const { ApiError } = require("../middleware/errorHandler");
const billingService = require("./billingService");

/**
 * The Daily Question.
 *
 * One question a day for everyone, the same for every member, changing at
 * midnight India time. Answering gives one Spark. The answer is kept so it
 * can feed matching later.
 *
 * Which question runs today is worked out from the date and the list of
 * active questions - no scheduler, nothing to forget to run. Turning a
 * question off in the admin panel takes it out of the rotation.
 */
const REWARD_SPARKS = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Day number since 1970 in India time - the same for everyone all day. */
function dayNumber(day) {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / MS_PER_DAY);
}

async function todaysQuestion(now = new Date()) {
  const rows = await query(
    "SELECT id, question, options FROM daily_questions WHERE active = 1 ORDER BY id ASC",
  );
  if (!rows.length) return null;
  const day = billingService.indianDay(now);
  const row = rows[dayNumber(day) % rows.length];
  return {
    id: row.id,
    question: row.question,
    options: parseOptions(row.options),
    day,
  };
}

/** Today's question for this member, and their answer if they gave one. */
async function forMember(userId, now = new Date()) {
  const question = await todaysQuestion(now);
  if (!question) {
    return { question: null, answered: false, answer: null, reward: REWARD_SPARKS };
  }
  const [row] = await query(
    "SELECT question_id, answer FROM daily_question_answers WHERE user_id = ? AND answered_day = ?",
    [userId, question.day],
  );
  return {
    question: { id: question.id, text: question.question, options: question.options },
    // One answer a day. If an admin changed the rotation after they
    // answered, they are still done for today - just not on this question.
    answered: !!row,
    answer: row && Number(row.question_id) === Number(question.id) ? row.answer : null,
    reward: REWARD_SPARKS,
  };
}

/**
 * Answer today's question. Once a day: the primary key is (user, day), so a
 * second answer cannot be written even if two arrive together, and the
 * Spark is only given after the answer is safely stored.
 */
async function answer(userId, questionId, rawAnswer, now = new Date()) {
  const question = await todaysQuestion(now);
  if (!question || Number(questionId) !== Number(question.id)) {
    throw new ApiError(409, "That question has changed. Pull to refresh for today's.");
  }
  const chosen = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
  if (!question.options.includes(chosen)) {
    throw new ApiError(400, "Pick one of the answers given");
  }
  try {
    await query(
      `INSERT INTO daily_question_answers (user_id, answered_day, question_id, answer)
       VALUES (?, ?, ?, ?)`,
      [userId, question.day, question.id, chosen],
    );
  } catch (error) {
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      throw new ApiError(409, "You have already answered today's question. Come back tomorrow.");
    }
    throw error;
  }
  await billingService.addCredits(userId, "spark", REWARD_SPARKS);
  return { ok: true, answer: chosen, reward: REWARD_SPARKS };
}

/* ---------- Admin ---------- */

async function listAll() {
  const rows = await query(
    `SELECT q.id, q.question, q.options, q.active, q.created_at,
            (SELECT COUNT(*) FROM daily_question_answers a WHERE a.question_id = q.id) AS answers
       FROM daily_questions q
      ORDER BY q.id ASC`,
  );
  const today = await todaysQuestion();
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    options: parseOptions(row.options),
    active: Number(row.active) === 1,
    answers: Number(row.answers) || 0,
    today: !!today && today.id === row.id,
  }));
}

async function create(rawQuestion, rawOptions) {
  const question = typeof rawQuestion === "string" ? rawQuestion.trim() : "";
  if (question.length < 5 || question.length > 200) {
    throw new ApiError(400, "The question should be 5 to 200 characters");
  }
  const options = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option) => (typeof option === "string" ? option.trim() : ""))
    .filter(Boolean);
  const unique = [...new Set(options)];
  if (unique.length < 2 || unique.length > 4) {
    throw new ApiError(400, "Give 2 to 4 different answers");
  }
  if (unique.some((option) => option.length > 80)) {
    throw new ApiError(400, "Each answer should be 80 characters or less");
  }
  try {
    await query("INSERT INTO daily_questions (question, options) VALUES (?, ?)", [
      question,
      JSON.stringify(unique),
    ]);
  } catch (error) {
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      throw new ApiError(409, "That question is already in the list");
    }
    throw error;
  }
  return { ok: true };
}

async function setActive(id, active) {
  const result = await query("UPDATE daily_questions SET active = ? WHERE id = ?", [
    active ? 1 : 0,
    Number(id),
  ]);
  if ((result?.affectedRows ?? 0) === 0) throw new ApiError(404, "Question not found");
  return { ok: true };
}

module.exports = {
  REWARD_SPARKS,
  todaysQuestion,
  forMember,
  answer,
  listAll,
  create,
  setActive,
};
