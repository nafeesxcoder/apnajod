-- Who may message you (everyone, or only your matches), muted accounts, and
-- people a story is hidden from.
ALTER TABLE users ADD COLUMN message_from VARCHAR(10) NOT NULL DEFAULT 'everyone';
CREATE TABLE IF NOT EXISTS muted_accounts (
  user_id CHAR(36) NOT NULL,
  muted_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, muted_id),
  CONSTRAINT fk_mute_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mute_muted FOREIGN KEY (muted_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS story_hidden (
  owner_id CHAR(36) NOT NULL,
  viewer_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (owner_id, viewer_id),
  CONSTRAINT fk_hidden_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_hidden_viewer FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
