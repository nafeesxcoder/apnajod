-- Follow graph and account privacy.
--
-- The product is no longer a matching app: people find each other by username
-- or from their contacts, follow, and talk. Who may talk to whom is decided
-- here rather than by a curated match.
--
-- A public account can be messaged by anyone. A private account can only be
-- messaged by someone it has an accepted follow edge with, in either
-- direction, so that once two people are connected both sides can reply.

ALTER TABLE users
  ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0 AFTER avatar_url;

CREATE TABLE IF NOT EXISTS follows (
  id CHAR(36) PRIMARY KEY,
  follower_id CHAR(36) NOT NULL,
  following_id CHAR(36) NOT NULL,
  -- A follow of a public account is created already accepted. A private
  -- one starts pending until the owner responds.
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  responded_at DATETIME(6) NULL,
  CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_follow_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_follow_pair (follower_id, following_id),
  INDEX idx_follow_following_status (following_id, status),
  INDEX idx_follow_follower_status (follower_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Username lookup is the main way people find each other, so it is indexed
-- for prefix search.
CREATE INDEX idx_users_username_lookup ON users (username);
