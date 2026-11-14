-- Who saw a story, for its owner's "Seen by" list.
--
-- A view belongs to its story and is deleted with it (ON DELETE CASCADE)
-- when the story's 24 hours are up, so nothing about it is kept. Re-runs
-- on every deploy, and run.js skips a table that already exists.
CREATE TABLE IF NOT EXISTS story_views (
  story_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (story_id, user_id),
  INDEX idx_story_views_user (user_id),
  CONSTRAINT fk_story_view_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_view_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
