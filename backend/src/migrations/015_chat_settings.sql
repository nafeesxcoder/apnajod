CREATE TABLE IF NOT EXISTS chat_conversation_settings (
  conversation_id VARCHAR(160) NOT NULL,
  user_id CHAR(36) NOT NULL,
  settings JSON NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT fk_chatsettings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;