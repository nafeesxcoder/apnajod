-- Which post a report is about (NULL for a report about the account itself),
-- so the admin queue can show the photo and remove just that post. No foreign
-- key: a removed post's reports stay as the record of what was decided.
-- Re-runs on every deploy, and run.js skips a column or index that already exists.
ALTER TABLE reports ADD COLUMN post_id CHAR(36) NULL;

CREATE INDEX idx_reports_post ON reports (post_id);
