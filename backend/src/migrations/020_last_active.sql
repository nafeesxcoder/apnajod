ALTER TABLE users
  ADD COLUMN last_active_at DATETIME(6) NULL AFTER email;
