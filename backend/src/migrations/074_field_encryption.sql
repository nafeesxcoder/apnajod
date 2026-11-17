-- Field-level encryption for phone and email (see services/fieldCrypto.js).
-- Encrypted values are much longer than the plain value, so the columns grow.
-- The blind-index columns carry exact lookups and uniqueness. The existing
-- phone and email unique indexes stay: ciphertext is random, so they never
-- collide and keeping them costs nothing.
-- Safe to re-run: the runner skips duplicate column and key errors.
ALTER TABLE users MODIFY COLUMN phone VARCHAR(100) NULL;
ALTER TABLE users MODIFY COLUMN email VARCHAR(512) NULL;
ALTER TABLE users ADD COLUMN phone_hash CHAR(64) NULL AFTER phone;
ALTER TABLE users ADD COLUMN email_hash CHAR(64) NULL AFTER email;
ALTER TABLE users ADD UNIQUE KEY uniq_users_phone_hash (phone_hash);
ALTER TABLE users ADD UNIQUE KEY uniq_users_email_hash (email_hash);
