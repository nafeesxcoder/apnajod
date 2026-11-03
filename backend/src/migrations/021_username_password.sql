-- Username + password sign-in.
--
-- Members told us the old flow was too hard: it asked for a lot of details
-- before the account existed. Now an account is just a mobile number, a
-- username and a password. Everything else is optional profile work later.
--
-- `password_hash` is NULL for accounts created before this migration (they
-- signed in with an OTP only) and for accounts created through OAuth.
-- `must_change_password` is set after a phone-OTP password reset so the app
-- can force the update screen before letting anyone in.

ALTER TABLE users ADD COLUMN username VARCHAR(20) NULL AFTER email;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER username;
ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;
ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL AFTER must_change_password;

-- Usernames are stored lowercase, so a plain unique index is case-correct.
ALTER TABLE users ADD UNIQUE KEY uniq_users_username (username);

-- Failed sign-in throttling, per account. Cleared on a successful sign-in.
ALTER TABLE users ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0 AFTER password_changed_at;
ALTER TABLE users ADD COLUMN locked_until DATETIME NULL AFTER failed_login_count;

-- A password reset consumes a phone OTP, so the OTP purpose list needs the
-- new value. ENUM changes are not in the skippable-error list used by the
-- migration runner, so this is written to be safe to re-run.
ALTER TABLE otp_codes MODIFY COLUMN purpose
  ENUM('login', 'verify', 'register', 'password_reset') NOT NULL DEFAULT 'login';
