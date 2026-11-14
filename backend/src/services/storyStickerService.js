const crypto = require('crypto');
const { query } = require('../config/db');
const { VISIBLE_TO_VIEWER, visibleParams } = require('./storyVisibility');

/**
 * The stickers people can use on a story - a poll, a question box and
 * @mentions - and the votes and answers on them. They are kept on the
 * story's row (as JSON) and in tables that are deleted with the story, so
 * after 24 hours nothing is left.
 */
const MAX_STICKERS = 8;
const MAX_MENTIONS = 5;
const MAX_ANSWER = 300;
/** Answers one person may send to one story. */
const MAX_ANSWERS_EACH = 5;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const num = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * Stickers as sent by the app, checked: known kinds only, short texts,
 * positions inside the story, at most one poll, one question and five
 * mentions. Anything else is dropped.
 */
function cleanStickers(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  let polls = 0;
  let questions = 0;
  let mentions = 0;
  for (const item of list.slice(0, 20)) {
    if (!item || typeof item !== 'object' || out.length >= MAX_STICKERS) continue;
    const id = String(item.id || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
    if (!id || seen.has(id)) continue;
    const place = {
      id,
      x: num(item.x, 0, 1, 0.5),
      y: num(item.y, 0, 1, 0.5),
      scale: num(item.scale, 0.3, 5, 1),
      rotation: num(item.rotation, -3600, 3600, 0) % 360,
    };
    if (item.kind === 'poll' && polls < 1) {
      const options = Array.isArray(item.options) ? item.options.map((o) => text(o, 25)) : [];
      if (options.length !== 2 || !options[0] || !options[1]) continue;
      out.push({ ...place, kind: 'poll', question: text(item.question, 80), options });
      polls += 1;
    } else if (item.kind === 'question' && questions < 1) {
      const prompt = text(item.prompt, 80);
      if (!prompt) continue;
      out.push({ ...place, kind: 'question', prompt });
      questions += 1;
    } else if (item.kind === 'mention' && mentions < MAX_MENTIONS) {
      const userId = String(item.userId || '').slice(0, 36);
      const username = text(item.username, 40);
      if (!userId || !username) continue;
      out.push({ ...place, kind: 'mention', userId, username });
      mentions += 1;
    } else continue;
    seen.add(id);
  }
  return out;
}

/** Mentions of real, active members you have not blocked (and who have not blocked you). */
async function keepRealMentions(posterId, stickers) {
  const ids = [...new Set(stickers.filter((s) => s.kind === 'mention').map((s) => s.userId))].filter((id) => id !== posterId);
  if (!ids.length) return stickers.filter((s) => s.kind !== 'mention');
  const marks = ids.map(() => '?').join(', ');
  const rows = await query(
    `SELECT u.id, u.username FROM users u
      WHERE u.id IN (${marks}) AND u.deleted_at IS NULL AND u.deactivated_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM blocks b
                         WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                            OR (b.blocker_id = u.id AND b.blocked_id = ?))`,
    [...ids, posterId, posterId],
  );
  const real = new Map(rows.map((row) => [row.id, row.username]));
  return stickers
    .filter((s) => s.kind !== 'mention' || real.has(s.userId))
    .map((s) => (s.kind === 'mention' ? { ...s, username: real.get(s.userId) || s.username } : s));
}

function push(userId, payload) {
  return require('./pushService')
    .notifyUser(userId, payload)
    .catch(() => undefined);
}

async function usernameOf(userId) {
  const [row] = await query('SELECT username FROM users WHERE id = ? LIMIT 1', [userId]);
  return row?.username ? `@${row.username}` : 'Someone';
}

/** Saves a new story's mentions and tells each person. */
async function saveMentions(storyId, posterId, stickers) {
  const ids = [...new Set(stickers.filter((s) => s.kind === 'mention').map((s) => s.userId))];
  if (!ids.length) return;
  for (const id of ids) {
    await query('INSERT IGNORE INTO story_mentions (story_id, user_id) VALUES (?, ?)', [storyId, id]);
  }
  const who = await usernameOf(posterId);
  // Tapping it opens their stories.
  for (const id of ids) push(id, { title: 'Apnajoda', body: `${who} mentioned you in their story`, storyUserId: posterId });
}

/**
 * A story you may see right now, or null: up for less than 24 hours, from
 * an active member, yours / public / a match's / one you are mentioned in,
 * and no block either way. The same rule as the stories row on Home.
 */
async function visibleStory(viewerId, storyId) {
  const [row] = await query(
    `SELECT s.id, s.user_id, s.stickers
       FROM stories s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > NOW(6)
        AND u.deleted_at IS NULL AND u.deactivated_at IS NULL
        AND ${VISIBLE_TO_VIEWER}
        AND NOT EXISTS (SELECT 1 FROM blocks b
                         WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                            OR (b.blocker_id = u.id AND b.blocked_id = ?))
      LIMIT 1`,
    [String(storyId || ''), ...visibleParams(viewerId), viewerId, viewerId],
  );
  return row || null;
}

const parse = (raw) => {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

async function pollCounts(storyId, stickerId) {
  const rows = await query(
    'SELECT choice, COUNT(*) AS n FROM story_votes WHERE story_id = ? AND sticker_id = ? GROUP BY choice',
    [storyId, stickerId],
  );
  const counts = [0, 0];
  for (const row of rows) if (row.choice === 0 || row.choice === 1) counts[row.choice] = Number(row.n);
  return counts;
}

/** One vote per person per poll; it cannot be changed (as on Instagram). Not on your own story. */
async function vote(viewerId, storyId, stickerId, choice) {
  const story = await visibleStory(viewerId, storyId);
  if (!story) throw fail(404, 'That story is not available.');
  if (story.user_id === viewerId) throw fail(400, 'You cannot vote on your own poll.');
  const sticker = parse(story.stickers).find((s) => s.id === stickerId && s.kind === 'poll');
  if (!sticker) throw fail(404, 'That poll is not on this story.');
  const pick = Number(choice);
  if (pick !== 0 && pick !== 1) throw fail(400, 'Choose one of the two answers.');
  await query('INSERT IGNORE INTO story_votes (story_id, sticker_id, user_id, choice) VALUES (?, ?, ?, ?)', [
    storyId,
    stickerId,
    viewerId,
    pick,
  ]);
  const [mine] = await query('SELECT choice FROM story_votes WHERE story_id = ? AND sticker_id = ? AND user_id = ?', [
    storyId,
    stickerId,
    viewerId,
  ]);
  return { counts: await pollCounts(storyId, stickerId), myVote: mine ? Number(mine.choice) : pick };
}

/** An answer to a question sticker; the story's owner sees it (and gets a push). */
async function answer(viewerId, storyId, stickerId, body) {
  const story = await visibleStory(viewerId, storyId);
  if (!story) throw fail(404, 'That story is not available.');
  if (story.user_id === viewerId) throw fail(400, 'You cannot answer your own question.');
  const sticker = parse(story.stickers).find((s) => s.id === stickerId && s.kind === 'question');
  if (!sticker) throw fail(404, 'That question is not on this story.');
  const reply = String(body ?? '').replace(/\r\n/g, '\n').trim().slice(0, MAX_ANSWER);
  if (!reply) throw fail(400, 'Write something first.');
  const [{ n } = { n: 0 }] = await query('SELECT COUNT(*) AS n FROM story_answers WHERE story_id = ? AND user_id = ?', [
    storyId,
    viewerId,
  ]);
  if (Number(n) >= MAX_ANSWERS_EACH) throw fail(429, 'You have answered this story enough times.');
  const id = crypto.randomUUID();
  await query('INSERT INTO story_answers (id, story_id, sticker_id, user_id, body) VALUES (?, ?, ?, ?, ?)', [
    id,
    storyId,
    stickerId,
    viewerId,
    reply,
  ]);
  const who = await usernameOf(viewerId);
  const short = reply.replace(/\s+/g, ' ');
  push(story.user_id, { title: 'Apnajoda', body: `${who} answered your question: ${short.length > 70 ? `${short.slice(0, 69)}…` : short}` });
  return { ok: true };
}

const MEMBER = `u.id AS user_id, u.username,
  COALESCE(NULLIF(pr.first_name, ''), u.full_name, u.username) AS name,
  COALESCE(
    (SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = u.id ORDER BY ph.position ASC LIMIT 1),
    u.avatar_url
  ) AS avatar`;
const member = (row) => ({ userId: row.user_id, username: row.username, name: row.name || row.username, avatarUrl: row.avatar || null });

/** For the story's owner: who voted what, and the answers. Nobody else can see this. */
async function responses(ownerId, storyId) {
  const [story] = await query('SELECT id FROM stories WHERE id = ? AND user_id = ? AND expires_at > NOW(6)', [
    String(storyId || ''),
    ownerId,
  ]);
  if (!story) throw fail(404, 'That story is not yours, or it has already gone.');
  const votes = await query(
    `SELECT v.sticker_id, v.choice, v.created_at, ${MEMBER}
       FROM story_votes v JOIN users u ON u.id = v.user_id LEFT JOIN profiles pr ON pr.user_id = u.id
      WHERE v.story_id = ? AND u.deleted_at IS NULL
      ORDER BY v.created_at DESC LIMIT 1000`,
    [storyId],
  );
  const answers = await query(
    `SELECT a.id, a.sticker_id, a.body, a.created_at, ${MEMBER}
       FROM story_answers a JOIN users u ON u.id = a.user_id LEFT JOIN profiles pr ON pr.user_id = u.id
      WHERE a.story_id = ? AND u.deleted_at IS NULL
      ORDER BY a.created_at DESC LIMIT 500`,
    [storyId],
  );
  const likes = await query(
    `SELECT l.created_at, ${MEMBER}
       FROM story_likes l JOIN users u ON u.id = l.user_id LEFT JOIN profiles pr ON pr.user_id = u.id
      WHERE l.story_id = ? AND u.deleted_at IS NULL
      ORDER BY l.created_at DESC LIMIT 1000`,
    [storyId],
  );
  // Seen by: newest first, with whether they liked it.
  const views = await query(
    `SELECT v.created_at, EXISTS (SELECT 1 FROM story_likes l WHERE l.story_id = v.story_id AND l.user_id = v.user_id) AS liked, ${MEMBER}
       FROM story_views v JOIN users u ON u.id = v.user_id LEFT JOIN profiles pr ON pr.user_id = u.id
      WHERE v.story_id = ? AND u.deleted_at IS NULL
      ORDER BY v.created_at DESC LIMIT 1000`,
    [storyId],
  );
  return {
    views: views.map((row) => ({ at: row.created_at, liked: !!Number(row.liked), user: member(row) })),
    likes: likes.map((row) => ({ at: row.created_at, user: member(row) })),
    votes: votes.map((row) => ({ stickerId: row.sticker_id, choice: Number(row.choice), at: row.created_at, user: member(row) })),
    answers: answers.map((row) => ({ id: row.id, stickerId: row.sticker_id, body: row.body, at: row.created_at, user: member(row) })),
  };
}

/** Story likes already pushed to the owner (kept in memory; stories last a day). */
const likePushed = new Set();

/**
 * The heart on someone's story. Anyone who can see the story can like it,
 * never their own. The like is deleted with the story after 24 hours.
 */
async function like(viewerId, storyId, liked = true) {
  const story = await visibleStory(viewerId, storyId);
  if (!story) throw fail(404, 'That story has already gone.');
  if (story.user_id === viewerId) throw fail(400, 'You cannot like your own story.');
  if (liked) {
    const added = await query('INSERT IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)', [story.id, viewerId]);
    // "@rahul liked your story" - once per person per story, so liking,
    // unliking and liking again does not send it twice.
    const key = `${story.id}:${viewerId}`;
    if (added.affectedRows && !likePushed.has(key)) {
      if (likePushed.size > 20000) likePushed.clear();
      likePushed.add(key);
      push(story.user_id, { title: 'Apnajoda', body: `${await usernameOf(viewerId)} liked your story`, storyUserId: story.user_id });
    }
  } else await query('DELETE FROM story_likes WHERE story_id = ? AND user_id = ?', [story.id, viewerId]);
  return { liked: !!liked };
}

/**
 * You watched someone's story: you go on its "Seen by" list, which only the
 * owner sees. Deleted with the story after 24 hours.
 */
async function view(viewerId, storyId) {
  const story = await visibleStory(viewerId, storyId);
  if (!story) throw fail(404, 'That story has already gone.');
  if (story.user_id === viewerId) return { seen: false };
  await query('INSERT IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)', [story.id, viewerId]);
  return { seen: true };
}

/** Adds your own like to others' stories, and the like count to your own. */
async function withLikes(viewerId, people) {
  const stories = people.flatMap((person) => person.stories.map((story) => ({ story, mine: person.mine })));
  if (!stories.length) return;
  const ids = stories.map(({ story }) => story.id);
  const marks = ids.map(() => '?').join(', ');
  const mine = new Set(
    (await query(`SELECT story_id FROM story_likes WHERE user_id = ? AND story_id IN (${marks})`, [viewerId, ...ids])).map(
      (row) => row.story_id,
    ),
  );
  const ownIds = stories.filter((s) => s.mine).map(({ story }) => story.id);
  const counts = new Map();
  if (ownIds.length) {
    const rows = await query(
      `SELECT story_id, COUNT(*) AS n FROM story_likes WHERE story_id IN (${ownIds.map(() => '?').join(', ')}) GROUP BY story_id`,
      ownIds,
    );
    for (const row of rows) counts.set(row.story_id, Number(row.n));
  }
  // And how many have seen each of your own.
  const views = new Map();
  if (ownIds.length) {
    const rows = await query(
      `SELECT story_id, COUNT(*) AS n FROM story_views WHERE story_id IN (${ownIds.map(() => '?').join(', ')}) GROUP BY story_id`,
      ownIds,
    );
    for (const row of rows) views.set(row.story_id, Number(row.n));
  }
  for (const { story, mine: own } of stories) {
    if (own) {
      story.likeCount = counts.get(story.id) || 0;
      story.viewCount = views.get(story.id) || 0;
    } else story.liked = mine.has(story.id);
  }
}

/** Adds poll results (counts, and your own vote) to the stories on the row. */
async function withResults(viewerId, stories) {
  const ids = stories.filter((s) => s.stickers.some((k) => k.kind === 'poll')).map((s) => s.id);
  if (!ids.length) return stories;
  const marks = ids.map(() => '?').join(', ');
  const counts = await query(
    `SELECT story_id, sticker_id, choice, COUNT(*) AS n FROM story_votes
      WHERE story_id IN (${marks}) GROUP BY story_id, sticker_id, choice`,
    ids,
  );
  const mine = await query(`SELECT story_id, sticker_id, choice FROM story_votes WHERE user_id = ? AND story_id IN (${marks})`, [
    viewerId,
    ...ids,
  ]);
  const key = (storyId, stickerId) => `${storyId}|${stickerId}`;
  const tally = new Map();
  for (const row of counts) {
    const k = key(row.story_id, row.sticker_id);
    const list = tally.get(k) || [0, 0];
    if (row.choice === 0 || row.choice === 1) list[row.choice] = Number(row.n);
    tally.set(k, list);
  }
  const voted = new Map(mine.map((row) => [key(row.story_id, row.sticker_id), Number(row.choice)]));
  for (const story of stories) {
    story.stickers = story.stickers.map((s) =>
      s.kind === 'poll'
        ? { ...s, counts: tally.get(key(story.id, s.id)) || [0, 0], myVote: voted.has(key(story.id, s.id)) ? voted.get(key(story.id, s.id)) : null }
        : s,
    );
  }
  return stories;
}

module.exports = {
  like,
  view,
  withLikes,
  MAX_STICKERS,
  MAX_MENTIONS,
  MAX_ANSWER,
  MAX_ANSWERS_EACH,
  cleanStickers,
  keepRealMentions,
  saveMentions,
  visibleStory,
  vote,
  answer,
  responses,
  withResults,
  parseStickers: parse,
};
