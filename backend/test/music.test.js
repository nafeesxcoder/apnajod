/**
 * Story music: a library the admin fills, and a clip of 5 to 30 seconds
 * per story - only which song and where, never a sound file per story.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const service = read("src/services/musicService.js");
const story = read("src/services/storyService.js");
const migration = read("src/migrations/053_story_music.sql");
const admin = read("src/routes/adminRoutes.js");
const { MIN_CLIP, MAX_CLIP, musicFilePath } = require("../src/services/musicService");

test("a story's music plays for 5 to 30 seconds", () => {
  assert.equal(MIN_CLIP, 5);
  assert.equal(MAX_CLIP, 30);
  assert.match(service, /seconds < MIN_CLIP \|\| seconds > MAX_CLIP/);
});

test("a story keeps only the song, the start and the length, deleted with it", () => {
  assert.match(migration, /ALTER TABLE stories ADD COLUMN music_track_id CHAR\(36\) NULL/);
  assert.match(migration, /ALTER TABLE stories ADD COLUMN music_length TINYINT UNSIGNED NULL/);
  assert.doesNotMatch(migration, /story_music_files|BLOB/i);
  assert.match(story, /music_track_id, music_start, music_length/);
});

test("the clip is checked before the story is saved, and a bad one leaves no file", () => {
  const create = story.slice(story.indexOf("async function create"));
  assert.match(create, /clipFor\(music\.trackId, music\.start, music\.length\)/);
  assert.match(create, /await removeFile\(path\.join\(STORY_DIR, file\.filename\)\);\n    throw error;/);
});

test("only the admin adds or removes songs", () => {
  assert.ok(admin.indexOf("router.use(requireAdmin)") < admin.indexOf('router.post("/music"'));
  assert.match(admin, /musicUpload\.single\("audio"\)/);
});

test("removing a song deletes its file and takes it off live stories", () => {
  assert.match(service, /UPDATE stories SET music_track_id = NULL/);
  assert.equal(musicFilePath("https://x/api/uploads/music/abc.mp3", "/m"), path.join("/m", "abc.mp3"));
  assert.equal(musicFilePath("https://x/api/uploads/photos/abc.jpg", "/m"), null);
});

test("no semicolons inside the migration's comments", () => {
  for (const line of migration.split("\n")) if (line.trim().startsWith("--")) assert.doesNotMatch(line, /;/);
});
