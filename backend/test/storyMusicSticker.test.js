const test = require("node:test");
const assert = require("node:assert");

/**
 * Story music like Instagram: the song's words with times (added by the
 * admin), only the part a story plays, and the music sticker's styles.
 * The lines below are made up for the test.
 */
const music = require("../src/services/musicService");
const { clipLyrics } = require("../src/services/storyService");
const { cleanStickers } = require("../src/services/storyStickerService");

const SAMPLE = ["[00:01.50] Test line one", "[00:05] Test line two", "garbage without a time", "[00:09.25][00:20] Test line three", "[00:14]", "[01:02.5] Test line four"].join("\n");

test("reads words with times in order, repeats, gaps and all", () => {
  assert.deepEqual(music.parseLyrics(SAMPLE), [
    { at: 1.5, text: "Test line one" },
    { at: 5, text: "Test line two" },
    { at: 9.25, text: "Test line three" },
    { at: 14, text: "" },
    { at: 20, text: "Test line three" },
    { at: 62.5, text: "Test line four" },
  ]);
  assert.deepEqual(music.parseLyrics("no times here\nat all"), []);
});

test("keeps the words in one tidy form", () => {
  const text = music.lyricsText(music.parseLyrics("[1:5.2] Test line one\n[00:00] Start"));
  assert.equal(text, "[00:00.00] Start\n[01:05.20] Test line one");
});

test("a story gets only the lines of its clip, from the one already playing", () => {
  const stored = music.lyricsText(music.parseLyrics(SAMPLE));
  assert.deepEqual(clipLyrics(stored, 6, 10).map((l) => l.at), [5, 9.25, 14]);
  assert.deepEqual(clipLyrics(stored, 0, 5).map((l) => l.at), [1.5]);
  assert.deepEqual(clipLyrics(stored, 100, 15).map((l) => l.at), [62.5]);
  assert.deepEqual(clipLyrics(null, 0, 15), []);
});

test("the music sticker: one, a known style, a lyrics font only for lyrics", () => {
  const out = cleanStickers([
    { id: "m1", kind: "music", style: "lyrics", lyricFont: "glow", x: 0.5, y: 0.3, scale: 1, rotation: 0 },
    { id: "m2", kind: "music", style: "card" },
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual({ kind: out[0].kind, style: out[0].style, lyricFont: out[0].lyricFont }, { kind: "music", style: "lyrics", lyricFont: "glow" });
  const odd = cleanStickers([{ id: "m3", kind: "music", style: "hologram", lyricFont: "glow" }]);
  assert.equal(odd[0].style, "card");
  assert.equal(odd[0].lyricFont, undefined);
});

test("words without times are refused; the admin can add a cover and words", async () => {
  await assert.rejects(music.setLyrics("x", "just words"), /Put a time before each line/);
  const fs = require("node:fs");
  const routes = fs.readFileSync(require.resolve("../src/routes/adminRoutes.js"), "utf8");
  assert.match(routes, /router\.post\("\/music\/:id\/lyrics"/);
  assert.match(routes, /router\.post\("\/music\/:id\/cover", coverUpload\.single\("cover"\)/);
  const sql = fs.readFileSync(require.resolve("../src/migrations/069_music_cover_lyrics.sql"), "utf8");
  assert.match(sql, /ADD COLUMN cover_url VARCHAR\(500\) NULL;/);
  assert.match(sql, /ADD COLUMN lyrics TEXT NULL;/);
});
