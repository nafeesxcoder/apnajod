ALTER TABLE chat_messages
  ADD COLUMN hidden_by JSON NULL AFTER starred_by;