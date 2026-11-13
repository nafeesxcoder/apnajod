const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

/**
 * The story music library. Songs are added by the admin (royalty-free for
 * now; a licensed music service can be plugged in here later, behind the
 * same search). A story plays a clip of one song: 5 to 30 seconds.
 */
const MIN_CLIP = 5;
const MAX_CLIP = 30;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const track = (row) => ({
  id: row.id,
  title: row.title,
  artist: row.artist || '',
  url: row.media_url,
  durationSec: Number(row.duration_sec) || 0,
});

/** Songs whose title or artist matches, newest first; all songs if no words. */
async function search(words) {
  const q = String(words || '').trim().slice(0, 60);
  const rows = q
    ? await query(
        `SELECT id, title, artist, media_url, duration_sec FROM music_tracks
          WHERE title LIKE ? OR artist LIKE ?
          ORDER BY created_at DESC LIMIT 60`,
        [`%${q}%`, `%${q}%`],
      )
    : await query('SELECT id, title, artist, media_url, duration_sec FROM music_tracks ORDER BY created_at DESC LIMIT 60');
  return rows.map(track);
}

async function list() {
  const rows = await query('SELECT id, title, artist, media_url, duration_sec FROM music_tracks ORDER BY created_at DESC LIMIT 500');
  return rows.map(track);
}

function musicFilePath(mediaUrl, dir) {
  const match = /\/uploads\/music\/([A-Za-z0-9._-]+)$/.exec(String(mediaUrl || '').split(/[?#]/)[0]);
  if (!match || match[1].startsWith('.')) return null;
  return path.join(dir, match[1]);
}

async function add({ title, artist, durationSec, file, publicBase }) {
  const { MUSIC_DIR } = require('../middleware/musicUpload');
  const name = String(title || '').trim().slice(0, 120);
  if (!name) {
    await fs.promises.unlink(path.join(MUSIC_DIR, file.filename)).catch(() => undefined);
    throw fail(400, 'Give the song a title.');
  }
  const id = crypto.randomUUID();
  const mediaUrl = `${publicBase}/uploads/music/${file.filename}`;
  const seconds = Math.max(0, Math.min(65535, Math.round(Number(durationSec) || 0)));
  await query('INSERT INTO music_tracks (id, title, artist, media_url, duration_sec) VALUES (?, ?, ?, ?, ?)', [
    id,
    name,
    String(artist || '').trim().slice(0, 120),
    mediaUrl,
    seconds,
  ]);
  return { id, title: name, artist: String(artist || '').trim().slice(0, 120), url: mediaUrl, durationSec: seconds };
}

/** Takes a song out of the library: its file, and off any story still playing it. */
async function remove(id) {
  const { MUSIC_DIR } = require('../middleware/musicUpload');
  const [row] = await query('SELECT media_url FROM music_tracks WHERE id = ?', [String(id || '')]);
  if (!row) throw fail(404, 'That song is not in the library.');
  await query('UPDATE stories SET music_track_id = NULL, music_start = NULL, music_length = NULL WHERE music_track_id = ?', [id]);
  await query('DELETE FROM music_tracks WHERE id = ?', [id]);
  const file = musicFilePath(row.media_url, MUSIC_DIR);
  if (file) await fs.promises.unlink(file).catch(() => undefined);
  return { ok: true };
}

/**
 * The clip a new story asks for, checked: a song in the library, a start
 * inside it, and 5 to 30 seconds long. null when the story has no music.
 */
async function clipFor(trackId, start, length) {
  if (!trackId) return null;
  const [row] = await query('SELECT id, duration_sec FROM music_tracks WHERE id = ?', [String(trackId)]);
  if (!row) throw fail(400, 'That song is no longer available.');
  const seconds = Math.round(Number(length));
  if (!Number.isFinite(seconds) || seconds < MIN_CLIP || seconds > MAX_CLIP) {
    throw fail(400, `Music can play for ${MIN_CLIP} to ${MAX_CLIP} seconds.`);
  }
  let from = Math.max(0, Math.floor(Number(start) || 0));
  const duration = Number(row.duration_sec) || 0;
  if (duration) from = Math.min(from, Math.max(0, duration - seconds));
  return { trackId: row.id, start: from, length: seconds };
}

module.exports = { MIN_CLIP, MAX_CLIP, search, list, add, remove, clipFor, musicFilePath };
