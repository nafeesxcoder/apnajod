-- Temporary deactivation (Instagram-style: hides the account, reversible any time by logging back in)
-- Distinct from deleted_at, which is a permanent delete on a 30-day grace timer.
ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL AFTER deleted_at;