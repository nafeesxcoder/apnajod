-- Demo accounts: real accounts an admin makes for store and partner reviews.
-- They behave like any member; the flag only lets the admin find and delete them.
ALTER TABLE users ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 0;
CREATE INDEX idx_users_is_demo ON users (is_demo);
