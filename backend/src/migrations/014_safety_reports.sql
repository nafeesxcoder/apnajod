CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  reporter_id CHAR(36) NOT NULL,
  reported_id CHAR(36) NOT NULL,
  reason VARCHAR(160) NOT NULL,
  details TEXT,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reported FOREIGN KEY (reported_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reports_reported (reported_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;