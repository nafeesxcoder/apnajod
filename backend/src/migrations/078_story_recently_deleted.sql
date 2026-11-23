-- A story you delete is kept 30 days in Recently deleted, then removed for
-- good. Deleting sets deleted_at and ends the story at once (expires_at).
ALTER TABLE stories ADD COLUMN deleted_at DATETIME(6) NULL;
ALTER TABLE stories ADD INDEX idx_stories_deleted (deleted_at);
