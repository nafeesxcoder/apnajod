-- 032_admin_role.sql
-- Add a role column to distinguish regular members from administrators.
-- Admin panel will be accessible only to users with role = 'admin'.
-- Re-runs on every deploy, so written to be safe the second time.

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' AFTER status;
CREATE INDEX idx_users_role ON users (role);