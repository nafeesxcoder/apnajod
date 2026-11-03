ALTER TABLE chat_messages
  ADD COLUMN starred_by JSON NULL AFTER status,
  ADD COLUMN pinned_at DATETIME(6) NULL AFTER starred_by,
  ADD COLUMN reactions JSON NULL AFTER pinned_at,
  ADD COLUMN edited_at DATETIME(6) NULL AFTER reactions,
  ADD COLUMN deleted_at DATETIME(6) NULL AFTER edited_at,
  ADD COLUMN deleted_for_everyone TINYINT(1) NOT NULL DEFAULT 0 AFTER deleted_at;