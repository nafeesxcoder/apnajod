-- Close friends: a list each member keeps, and stories only that list sees.
--
-- The list is the member's own setting and stays until they change it.
-- A story shared to close friends is still deleted with everything on it
-- after 24 hours, like every story. Re-runs on every deploy, and run.js
-- skips a table or column that already exists.
CREATE TABLE IF NOT EXISTS close_friends (
  owner_id CHAR(36) NOT NULL,
  friend_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (owner_id, friend_id),
  INDEX idx_close_friends_friend (friend_id),
  CONSTRAINT fk_close_friend_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_close_friend_friend FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE stories ADD COLUMN audience VARCHAR(10) NOT NULL DEFAULT 'all';
