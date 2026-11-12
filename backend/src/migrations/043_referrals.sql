-- Invite & earn.
--
-- An invite link is apnajoda.com/?invite=<username>. When someone signs up
-- from it, one row is written here. When that new member has a name, an
-- age and a photo, the inviter gets a free Boost and the new member a free
-- Super Like. outcome says what happened: 'rewarded', or 'capped' when the
-- inviter had already earned the monthly maximum.
--
-- One row per new member (invitee_id is the key), so nobody can be
-- counted twice. Re-runs on every deploy - CREATE TABLE IF NOT EXISTS is
-- safe the second time.

CREATE TABLE IF NOT EXISTS referrals (
  invitee_id  CHAR(36)    NOT NULL PRIMARY KEY,
  inviter_id  CHAR(36)    NOT NULL,
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  settled_at  DATETIME(6) NULL,
  outcome     VARCHAR(16) NULL,
  CONSTRAINT fk_referral_invitee FOREIGN KEY (invitee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_inviter FOREIGN KEY (inviter_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_referral_inviter (inviter_id, settled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
