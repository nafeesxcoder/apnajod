-- Stories: a photo that shows for 24 hours, then is gone for good.
--
-- A row lives only while its story is up. jobs/cleanupStories.js deletes
-- the row AND its photo file as soon as expires_at passes (every 15
-- minutes, and on every server start). Nothing about a story - not who saw
-- it, not a copy of the photo - is kept after that. Rows also go with the
-- member's account (ON DELETE CASCADE). Re-runs on every deploy.
CREATE TABLE IF NOT EXISTS stories (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  INDEX idx_story_expires (expires_at),
  INDEX idx_story_user (user_id, created_at),
  CONSTRAINT fk_story_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
