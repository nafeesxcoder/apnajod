-- Story music, like Instagram: each song can have a cover picture and its
-- words with times (for the lyrics sticker). The admin adds both, and only
-- words they have the rights to. Re-runs on every deploy, and run.js skips
-- a column that already exists.
ALTER TABLE music_tracks ADD COLUMN cover_url VARCHAR(500) NULL;
ALTER TABLE music_tracks ADD COLUMN lyrics TEXT NULL;
