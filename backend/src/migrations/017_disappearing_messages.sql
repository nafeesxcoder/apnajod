ALTER TABLE chat_messages
  ADD COLUMN expires_at DATETIME(6) NULL AFTER updated_at_ms,
  ADD COLUMN delete_after_seen TINYINT(1) NOT NULL DEFAULT 0 AFTER expires_at;