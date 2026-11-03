-- Soft delete: the account is hidden straight away and purged after 30 days.
-- Signing back in inside that window restores it, so the row has to survive.
--
-- This file shipped empty, which meant a fresh database never got the column
-- and 007_deactivate.sql failed on "Unknown column 'deleted_at' in 'users'".
ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL AFTER status;

-- purgeExpiredDeletedUsers() sweeps on this column.
CREATE INDEX idx_users_deleted_at ON users (deleted_at);
