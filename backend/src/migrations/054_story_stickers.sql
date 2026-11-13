-- Stickers people can use on a story: a poll, a question box and @mentions.
--
-- Everything here belongs to one story and goes with it: the stickers sit
-- on the story's row, and votes, answers and mentions are deleted with the
-- row (ON DELETE CASCADE) when the story's 24 hours are up. Re-runs on
-- every deploy, and run.js skips a column or table that already exists.
ALTER TABLE stories ADD COLUMN stickers TEXT NULL;

CREATE TABLE IF NOT EXISTS story_votes (
  story_id CHAR(36) NOT NULL,
  sticker_id VARCHAR(40) NOT NULL,
  user_id CHAR(36) NOT NULL,
  choice TINYINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (story_id, sticker_id, user_id),
  CONSTRAINT fk_story_vote_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_vote_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS story_answers (
  id CHAR(36) PRIMARY KEY,
  story_id CHAR(36) NOT NULL,
  sticker_id VARCHAR(40) NOT NULL,
  user_id CHAR(36) NOT NULL,
  body VARCHAR(300) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_story_answers (story_id, created_at),
  CONSTRAINT fk_story_answer_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_answer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS story_mentions (
  story_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  PRIMARY KEY (story_id, user_id),
  INDEX idx_story_mentions_user (user_id),
  CONSTRAINT fk_story_mention_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_story_mention_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
