-- Music for stories: a library of songs the admin uploads (royalty-free,
-- for now), and the clip a story plays.
--
-- The songs stay (they are the library). A story only keeps which song,
-- where the clip starts and how long it is (at most 30 seconds) - and that
-- goes with the story's row after 24 hours. No sound file is saved per
-- story. Re-runs on every deploy, and run.js skips a column or table that
-- already exists.
CREATE TABLE IF NOT EXISTS music_tracks (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  artist VARCHAR(120) NOT NULL DEFAULT '',
  media_url VARCHAR(500) NOT NULL,
  duration_sec SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_music_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE stories ADD COLUMN music_track_id CHAR(36) NULL;
ALTER TABLE stories ADD COLUMN music_start SMALLINT UNSIGNED NULL;
ALTER TABLE stories ADD COLUMN music_length TINYINT UNSIGNED NULL;
