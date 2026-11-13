-- The shape a post was cropped to, as width / height, like Instagram:
-- 1 = square, 0.8 = portrait (4:5), 1.91 = landscape (1.91:1).
--
-- Posts made before this were all shown square, so they default to 1.
-- Re-runs on every deploy, and run.js skips a column that already exists.

ALTER TABLE posts ADD COLUMN aspect_ratio FLOAT NOT NULL DEFAULT 1;
