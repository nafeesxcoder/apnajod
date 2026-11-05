-- Reports were written and never read, so the queue had no idea which ones
-- had been dealt with. Without this the list can only ever grow.
ALTER TABLE reports
  ADD COLUMN review_status ENUM('open', 'actioned', 'dismissed') NOT NULL DEFAULT 'open';

ALTER TABLE reports
  ADD COLUMN reviewed_at DATETIME(6) NULL;

CREATE INDEX idx_reports_review_status ON reports (review_status);
