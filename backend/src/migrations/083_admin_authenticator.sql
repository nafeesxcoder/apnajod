-- Authenticator app codes (TOTP) for two-step verification. The secret is kept
-- encrypted; totp_pending holds a secret being set up until the first code checks out.
ALTER TABLE users
  ADD COLUMN totp_secret VARCHAR(255) NULL,
  ADD COLUMN totp_pending VARCHAR(255) NULL,
  ADD COLUMN totp_last_step BIGINT NULL;
