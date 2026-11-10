-- 033_account_appeals.sql
-- A suspended member can't sign in, so they can't reach Support either.
-- From the login screen they send an appeal and it lands in the admin
-- dashboard. One open appeal per account, sending again replaces the text.
-- Re-runs on every deploy, so written to be safe the second time.

CREATE TABLE IF NOT EXISTS account_appeals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('open','restored','rejected') NOT NULL DEFAULT 'open',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  resolved_at DATETIME(6) NULL,
  CONSTRAINT fk_appeals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_appeals_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
