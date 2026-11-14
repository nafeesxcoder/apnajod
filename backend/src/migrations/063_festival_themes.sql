-- Festival themes (Diwali, Eid and the rest) put on the whole app by an admin.
-- The themes themselves live in the app's code. A row here only says which
-- theme is on, from when and until when (UTC). A row with no end stays on
-- until an admin turns it off. The newest row that has started wins.
CREATE TABLE IF NOT EXISTS festival_schedule (
  id CHAR(36) NOT NULL PRIMARY KEY,
  theme_key VARCHAR(40) NOT NULL,
  greeting VARCHAR(120) NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY festival_window (starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
