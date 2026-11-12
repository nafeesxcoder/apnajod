const { query } = require("../config/db");
const chatService = require("./chatService");
const { ApiError } = require("../middleware/errorHandler");

/**
 * Opening lines for an empty chat.
 *
 * Most matches die at "Hi" - nobody knows what to say next. Before the
 * first message is sent, the chat offers three lines built from what the
 * two of them actually share: a hobby, a city, a daily question they both
 * answered the same way. Tapping one only fills the box; the member still
 * reads, edits and sends it themselves.
 *
 * No AI and nothing sent anywhere: plain templates over profile data both
 * people already show each other.
 */
const HOBBY_LINES = [
  (hobby) => `We both like ${hobby}! What got you into it?`,
  (hobby) => `Okay, ${hobby} fan to ${hobby} fan - what's your best memory of it?`,
  (hobby) => `${hobby} on a Sunday, yes or no? 😄`,
];

const CITY_LINES = [
  (city) => `Another ${city} person! What's your favourite spot there?`,
  (city) => `Best street food in ${city} - go, I need recommendations.`,
];

const ANSWER_LINES = [
  (question, answer) =>
    `We both picked "${answer}" for "${question}" - tell me why you chose it?`,
];

const GENERAL_LINES = [
  "Coffee date ☕ or a long walk? Pick one.",
  "What's one thing that always makes your day better?",
  "If we planned a weekend trip, mountains or beach?",
  "What's the best thing that happened to you this week?",
  "What are you most looking for in a partner?",
];

function parseList(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function cityOf(value) {
  return String(value || "").split(",")[0].trim();
}

/** Stable pick for a pair, so the lines do not reshuffle on every open. */
function seededIndex(seed, length) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return length ? hash % length : 0;
}

/**
 * Up to three lines for `userId` to open with `peerId`. Only for people who
 * can actually message each other - chatService decides that.
 */
async function forPair(userId, peerId) {
  try {
    await chatService.assertParticipant(peerId, userId);
  } catch (error) {
    // chatService marks this with `status`; the error handler reads
    // `statusCode`, so pass it on as an ApiError or it reports a 500.
    throw new ApiError(error.status || 403, "This conversation is not available.");
  }

  const rows = await query(
    "SELECT user_id, city, hobbies FROM profiles WHERE user_id IN (?, ?)",
    [userId, peerId],
  );
  const me = rows.find((row) => row.user_id === userId) || {};
  const them = rows.find((row) => row.user_id === peerId) || {};

  const seed = [userId, peerId].sort().join(":");
  const lines = [];

  // 1. A daily question they both answered the same way.
  const [sameAnswer] = await query(
    `SELECT q.question, a.answer
       FROM daily_question_answers a
       JOIN daily_question_answers b
         ON b.question_id = a.question_id AND b.answer = a.answer
       JOIN daily_questions q ON q.id = a.question_id
      WHERE a.user_id = ? AND b.user_id = ?
      ORDER BY a.answered_day DESC
      LIMIT 1`,
    [userId, peerId],
  );
  if (sameAnswer) lines.push(ANSWER_LINES[0](sameAnswer.question, sameAnswer.answer));

  // 2. A hobby they share.
  const mine = new Set(parseList(me.hobbies).map((h) => h.toLowerCase()));
  const shared = parseList(them.hobbies).filter((h) => mine.has(h.toLowerCase()));
  if (shared.length) {
    const hobby = shared[seededIndex(seed, shared.length)];
    const line = HOBBY_LINES[seededIndex(`${seed}h`, HOBBY_LINES.length)];
    lines.push(line(hobby.toLowerCase()));
  }

  // 3. Same city.
  const myCity = cityOf(me.city);
  if (myCity && myCity.toLowerCase() === cityOf(them.city).toLowerCase()) {
    lines.push(CITY_LINES[seededIndex(`${seed}c`, CITY_LINES.length)](myCity));
  }

  // 4. Fill up to three with general ones.
  let i = seededIndex(`${seed}g`, GENERAL_LINES.length);
  while (lines.length < 3) {
    const line = GENERAL_LINES[i % GENERAL_LINES.length];
    if (!lines.includes(line)) lines.push(line);
    i += 1;
  }
  return lines.slice(0, 3);
}

module.exports = { forPair, GENERAL_LINES };
