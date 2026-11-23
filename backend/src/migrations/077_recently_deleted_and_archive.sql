-- Recently deleted posts and archived stories, kept for 30 days.
-- A deleted post keeps its row (deleted_at) so it can be restored. A story
-- that has run its 24 hours is archived (archived_at) instead of removed, so
-- its owner can see it or share it again. Both go for good 30 days later.
ALTER TABLE posts ADD COLUMN deleted_at DATETIME(6) NULL;
ALTER TABLE posts ADD INDEX idx_posts_deleted (deleted_at);
ALTER TABLE stories ADD COLUMN archived_at DATETIME(6) NULL;
ALTER TABLE stories ADD INDEX idx_stories_archived (archived_at);
