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

/** Most lines of words a song can have, and the longest line. */
const MAX_LYRIC_LINES = 300;
const MAX_LYRIC_TEXT = 100;

/**
 * Words with times, written the usual way ("[01:05.20] a line"), read into
 * lines [{ at: seconds, text }] in time order. Lines without a time are
 * left out; a time with no words is a gap (an instrumental part).
 */
function parseLyrics(raw) {
  const lines = [];
  for (const row of String(raw || '').replace(/\r\n?/g, '\n').split('\n')) {
    const times = [];
    let rest = row;
    let match;
    while ((match = /^\s*\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/.exec(rest))) {
      const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
      times.push(Number(match[1]) * 60 + Number(match[2]) + fraction);
      rest = rest.slice(match[0].length);
    }
    if (!times.length) continue;
    const text = rest.replace(/\s+/g, ' ').trim().slice(0, MAX_LYRIC_TEXT);
    for (const at of times) lines.push({ at: Math.round(at * 100) / 100, text });
  }
  return lines.sort((a, b) => a.at - b.at).slice(0, MAX_LYRIC_LINES);
}

/** The words as they are kept: one "[mm:ss.xx] text" line each. */
function lyricsText(lines) {
  return lines
    .map(({ at, text }) => {
      const m = Math.floor(at / 60);
      const s = (at - m * 60).toFixed(2).padStart(5, '0');
      return `[${String(m).padStart(2, '0')}:${s}] ${text}`;
    })
    .join('\n');
}

const COLUMNS = 'id, title, artist, media_url, duration_sec, cover_url, lyrics';

const track = (row) => ({
  id: row.id,
  title: row.title,
  artist: row.artist || '',
  url: row.media_url,
  durationSec: Number(row.duration_sec) || 0,
  coverUrl: row.cover_url || null,
  lyrics: row.lyrics ? parseLyrics(row.lyrics) : [],
});

/** Songs whose title or artist matches, newest first; all songs if no words. */
async function search(words) {
  const q = String(words || '').trim().slice(0, 60);
  const rows = q
    ? await query(
        `SELECT ${COLUMNS} FROM music_tracks
          WHERE title LIKE ? OR artist LIKE ?
          ORDER BY created_at DESC LIMIT 60`,
        [`%${q}%`, `%${q}%`],
      )
    : await query(`SELECT ${COLUMNS} FROM music_tracks ORDER BY created_at DESC LIMIT 60`);
  return rows.map(track);
}

async function list() {
  const rows = await query(`SELECT ${COLUMNS} FROM music_tracks ORDER BY created_at DESC LIMIT 500`);
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
  return { id, title: name, artist: String(artist || '').trim().slice(0, 120), url: mediaUrl, durationSec: seconds, coverUrl: null, lyrics: [] };
}

/** The song's words with times; empty takes them off. */
async function setLyrics(id, raw) {
  const text = String(raw ?? '');
  const lines = parseLyrics(text);
  if (text.trim() && !lines.length) {
    throw fail(400, 'Put a time before each line, like [00:12] the words.');
  }
  const result = await query('UPDATE music_tracks SET lyrics = ? WHERE id = ?', [lines.length ? lyricsText(lines) : null, String(id || '')]);
  if (!result.affectedRows) throw fail(404, 'That song is not in the library.');
  return { ok: true, lyrics: lines };
}

/** A new cover picture for the song (the old one is deleted). */
async function setCover(id, file, publicBase) {
  const { MUSIC_DIR } = require('../middleware/musicUpload');
  const [row] = await query('SELECT cover_url FROM music_tracks WHERE id = ?', [String(id || '')]);
  if (!row) {
    await fs.promises.unlink(path.join(MUSIC_DIR, file.filename)).catch(() => undefined);
    throw fail(404, 'That song is not in the library.');
  }
  const coverUrl = `${publicBase}/uploads/music/${file.filename}`;
  await query('UPDATE music_tracks SET cover_url = ? WHERE id = ?', [coverUrl, id]);
  const old = musicFilePath(row.cover_url, MUSIC_DIR);
  if (old) await fs.promises.unlink(old).catch(() => undefined);
  return { ok: true, coverUrl };
}

/** Takes a song out of the library: its file, and off any story still playing it. */
async function remove(id) {
  const { MUSIC_DIR } = require('../middleware/musicUpload');
  const [row] = await query('SELECT media_url, cover_url FROM music_tracks WHERE id = ?', [String(id || '')]);
  if (!row) throw fail(404, 'That song is not in the library.');
  await query('UPDATE stories SET music_track_id = NULL, music_start = NULL, music_length = NULL WHERE music_track_id = ?', [id]);
  await query('DELETE FROM music_tracks WHERE id = ?', [id]);
  for (const url of [row.media_url, row.cover_url]) {
    const file = musicFilePath(url, MUSIC_DIR);
    if (file) await fs.promises.unlink(file).catch(() => undefined);
  }
  return { ok: true };
}

/**
 * The song's length, measured by the admin's browser when the upload could
 * not read it (it was saved as 0, so stories could only use the start).
 */
async function setDuration(id, durationSec) {
  const seconds = Math.round(Number(durationSec) || 0);
  if (seconds < 1 || seconds > 65535) throw fail(400, 'That length is not right.');
  const result = await query('UPDATE music_tracks SET duration_sec = ? WHERE id = ?', [seconds, String(id || '')]);
  if (!result.affectedRows) throw fail(404, 'That song is not in the library.');
  return { ok: true, durationSec: seconds };
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

module.exports = { MIN_CLIP, MAX_CLIP, search, list, add, remove, setDuration, setLyrics, setCover, clipFor, musicFilePath, parseLyrics, lyricsText };
