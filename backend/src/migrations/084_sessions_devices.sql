-- Where you're logged in: each sign-in on a device is a session (a family of
-- refresh tokens). Records the device, the address it came from, and when it was used.
ALTER TABLE refresh_tokens
  ADD COLUMN family_id CHAR(36) NULL,
  ADD COLUMN device VARCHAR(120) NULL,
  ADD COLUMN ip VARCHAR(64) NULL,
  ADD COLUMN last_used_at DATETIME NULL,
  ADD INDEX idx_refresh_family (family_id);
UPDATE refresh_tokens SET family_id = id WHERE family_id IS NULL;
