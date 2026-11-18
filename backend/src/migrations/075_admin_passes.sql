-- Free passes the admin gives a member, one row per member. The features
-- live in entitlements; this table keeps which plan and until when, so the
-- admin can see the pass and delete it.
CREATE TABLE IF NOT EXISTS admin_passes (
  user_id    CHAR(36)    NOT NULL PRIMARY KEY,
  plan       VARCHAR(20) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  granted_by CHAR(36)    NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_admin_pass_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
