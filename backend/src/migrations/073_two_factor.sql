-- Two-step verification (opt-in). When it is on, a password sign-in also needs
-- a 6-digit code sent to the member's verified mobile.
ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER locked_until;

-- The second step uses the OTP table with its own purpose, so a login code can
-- never confirm it, and the other way round. Every earlier value is kept.
ALTER TABLE otp_codes MODIFY COLUMN purpose
  ENUM('login', 'verify', 'register', 'password_reset', 'two_factor') NOT NULL DEFAULT 'login';
