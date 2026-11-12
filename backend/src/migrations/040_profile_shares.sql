-- "Show my family" share links.
--
-- A member can send a link to a profile to family (usually on WhatsApp).
-- Anyone with the link sees a limited card - first name, age, city, work,
-- photos, about and intent - with no username and no way to contact them.
-- Links expire after 7 days. Who may share whom is decided in
-- shareService: your own profile any time, someone else's only after a
-- mutual match.
--
-- Re-runs on every deploy. CREATE TABLE IF NOT EXISTS is safe the second time.

CREATE TABLE IF NOT EXISTS profile_shares (
  token      CHAR(32)    NOT NULL PRIMARY KEY,
  sharer_id  CHAR(36)    NOT NULL,
  target_id  CHAR(36)    NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  views      INT         NOT NULL DEFAULT 0,
  CONSTRAINT fk_share_sharer FOREIGN KEY (sharer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_share_target FOREIGN KEY (target_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_share_sharer (sharer_id, created_at),
  INDEX idx_share_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
