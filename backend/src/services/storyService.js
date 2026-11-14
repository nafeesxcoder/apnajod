const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { VISIBLE_TO_VIEWER, visibleParams } = require('./storyVisibility');

/**
 * Stories, Instagram-style: a photo up for 24 hours, then deleted - the
 * database row and the file both. Nothing else is stored: who looked at a
 * story is remembered only on the viewer's own phone.
 *
 * Who sees a story is the same rule as posts: everyone for a public
 * account, only matches for a private one, never across a block - and
 * anyone @mentioned in that one story.
 */

const STORY_HOURS = 24;
/** Most stories one member can put up in 24 hours. */
const MAX_STORIES_PER_DAY = 10;

function storyFilePath(mediaUrl, storyDir) {
  const match = /\/uploads\/stories\/([A-Za-z0-9._-]+)$/.exec(String(mediaUrl || '').split(/[?#]/)[0]);
  if (!match || match[1].startsWith('.')) return null;
  return path.join(storyDir, match[1]);
}

async function removeFile(file) {
  if (!file) return;
  await fs.promises.unlink(file).catch(() => undefined);
}

async function create(userId, file, publicBase, music = {}, rawStickers = null, rawAudience = 'all') {
  const { STORY_DIR } = require('../middleware/storyUpload');
  // A song clip, checked before anything is saved (5 to 30 seconds).
  let clip = null;
  try {
    clip = await require('./musicService').clipFor(music.trackId, music.start, music.length);
  } catch (error) {
    await removeFile(path.join(STORY_DIR, file.filename));
    throw error;
  }
  const [{ n } = { n: 0 }] = await query(
    'SELECT COUNT(*) AS n FROM stories WHERE user_id = ? AND expires_at > NOW(6)',
    [userId],
  );
  if (Number(n) >= MAX_STORIES_PER_DAY) {
    await removeFile(path.join(STORY_DIR, file.filename));
    const error = new Error(`You can have up to ${MAX_STORIES_PER_DAY} stories at a time. Try again when one expires.`);
    error.status = 429;
    throw error;
  }
  // Close friends: only the people on your list see it. The list must have someone.
  const audience = rawAudience === 'close' ? 'close' : 'all';
  const closeIds = audience === 'close' ? await require('./closeFriendsService').ids(userId) : null;
  if (closeIds && !closeIds.size) {
    await removeFile(path.join(STORY_DIR, file.filename));
    const error = new Error('Add people to your Close friends list first.');
    error.status = 400;
    throw error;
  }
  // Poll, question and @mention stickers: checked, mentions of real members only.
  // On a close-friends story you can only mention people on the list (others could not see it).
  const stickerService = require('./storyStickerService');
  const stickers = (await stickerService.keepRealMentions(userId, stickerService.cleanStickers(rawStickers))).filter(
    (sticker) => !closeIds || sticker.kind !== 'mention' || closeIds.has(sticker.userId),
  );
  const id = crypto.randomUUID();
  const mediaUrl = `${publicBase}/uploads/stories/${file.filename}`;
  await query(
    `INSERT INTO stories (id, user_id, media_url, expires_at, music_track_id, music_start, music_length, stickers, audience)
     VALUES (?, ?, ?, NOW(6) + INTERVAL ${STORY_HOURS} HOUR, ?, ?, ?, ?, ?)`,
    [id, userId, mediaUrl, clip?.trackId ?? null, clip?.start ?? null, clip?.length ?? null, stickers.length ? JSON.stringify(stickers) : null, audience],
  );
  await stickerService.saveMentions(id, userId, stickers);
  return { id, mediaUrl, music: clip, stickers, closeFriends: audience === 'close' };
}

/**
 * The stories row on Home: you first, then everyone with a live story you
 * may see, newest first. Each person's stories oldest first, the order
 * they play in.
 */
async function tray(viewerId) {
  const rows = await query(
    `SELECT s.id, s.user_id, s.media_url, s.created_at, s.expires_at,
            s.music_start, s.music_length, s.stickers, s.audience,
            mt.id AS music_id, mt.title AS music_title, mt.artist AS music_artist, mt.media_url AS music_url,
            u.username,
            COALESCE(NULLIF(pr.first_name, ''), u.full_name, u.username) AS name,
            COALESCE(
              (SELECT ph.photo_url FROM profile_photos ph WHERE ph.user_id = u.id ORDER BY ph.position ASC LIMIT 1),
              u.avatar_url
            ) AS avatar
       FROM stories s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN profiles pr ON pr.user_id = u.id
       LEFT JOIN music_tracks mt ON mt.id = s.music_track_id
      WHERE s.expires_at > NOW(6)
        AND u.deleted_at IS NULL AND u.deactivated_at IS NULL
        AND ${VISIBLE_TO_VIEWER}
        AND NOT EXISTS (SELECT 1 FROM blocks b
                         WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
                            OR (b.blocker_id = u.id AND b.blocked_id = ?))
      ORDER BY s.created_at ASC
      LIMIT 500`,
    [...visibleParams(viewerId), viewerId, viewerId],
  );
  const stickerService = require('./storyStickerService');
  const people = new Map();
  for (const row of rows) {
    if (!people.has(row.user_id)) {
      people.set(row.user_id, {
        user: { userId: row.user_id, username: row.username, name: row.name || row.username, avatarUrl: row.avatar || null },
        mine: row.user_id === viewerId,
        stories: [],
      });
    }
    people.get(row.user_id).stories.push({
      id: row.id,
      mediaUrl: row.media_url,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      stickers: stickerService.parseStickers(row.stickers),
      // Shared to close friends only: a green ring and badge.
      closeFriends: row.audience === 'close',
      music: row.music_id
        ? {
            trackId: row.music_id,
            title: row.music_title,
            artist: row.music_artist || '',
            url: row.music_url,
            start: Number(row.music_start) || 0,
            length: Number(row.music_length) || 15,
          }
        : null,
    });
  }
  // Who you can reply to: your matches (chat is between matches only).
  const others = [...people.values()].filter((person) => !person.mine).map((person) => person.user.userId);
  const matched = new Set();
  if (others.length) {
    const marks = others.map(() => '?').join(', ');
    const rows = await query(
      `SELECT user_a_id, user_b_id FROM mutual_matches
        WHERE (user_a_id = ? AND user_b_id IN (${marks})) OR (user_b_id = ? AND user_a_id IN (${marks}))`,
      [viewerId, ...others, viewerId, ...others],
    );
    for (const row of rows) matched.add(row.user_a_id === viewerId ? row.user_b_id : row.user_a_id);
  }
  for (const person of people.values()) person.canReply = !person.mine && matched.has(person.user.userId);

  // Hearts: your own like on others' stories, how many liked yours.
  await stickerService.withLikes(viewerId, [...people.values()]);
  // Poll results: how many voted each way, and your own vote.
  await stickerService.withResults(viewerId, [...people.values()].flatMap((person) => person.stories));
  const latest = (person) => new Date(person.stories[person.stories.length - 1].createdAt).getTime();
  return [...people.values()].sort((a, b) => (a.mine ? -1 : b.mine ? 1 : latest(b) - latest(a)));
}

/** Take down your own story now: the row and the file. */
async function remove(userId, storyId) {
  const { STORY_DIR } = require('../middleware/storyUpload');
  const [row] = await query('SELECT media_url FROM stories WHERE id = ? AND user_id = ?', [storyId, userId]);
  if (!row) {
    const error = new Error('That story is not yours, or it has already gone.');
    error.status = 404;
    throw error;
  }
  await query('DELETE FROM stories WHERE id = ?', [storyId]);
  await removeFile(storyFilePath(row.media_url, STORY_DIR));
  return { ok: true };
}

/**
 * Deletes every story past its 24 hours - file first, then row - and any
 * file left in uploads/stories older than 24 hours with no row (say, an
 * upload that failed half way). Returns how much went.
 */
async function purgeExpired(storyDir) {
  const { STORY_DIR } = require('../middleware/storyUpload');
  const dir = storyDir || STORY_DIR;
  let rows = 0;
  for (;;) {
    const expired = await query('SELECT id, media_url FROM stories WHERE expires_at <= NOW(6) LIMIT 500');
    if (!expired.length) break;
    for (const story of expired) await removeFile(storyFilePath(story.media_url, dir));
    await query(`DELETE FROM stories WHERE id IN (${expired.map(() => '?').join(', ')})`, expired.map((s) => s.id));
    rows += expired.length;
    if (expired.length < 500) break;
  }
  let files = 0;
  const cutoff = Date.now() - STORY_HOURS * 60 * 60 * 1000;
  const names = await fs.promises.readdir(dir).catch(() => []);
  for (const name of names) {
    const file = path.join(dir, name);
    const stat = await fs.promises.stat(file).catch(() => null);
    if (stat && stat.isFile() && stat.mtimeMs < cutoff) {
      await removeFile(file);
      files += 1;
    }
  }
  return { rows, files };
}

module.exports = { STORY_HOURS, MAX_STORIES_PER_DAY, create, tray, remove, purgeExpired, storyFilePath };
