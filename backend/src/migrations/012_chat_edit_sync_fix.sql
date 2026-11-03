ALTER TABLE chat_messages
  ADD COLUMN updated_at_ms BIGINT NOT NULL DEFAULT 0 AFTER created_at_ms;