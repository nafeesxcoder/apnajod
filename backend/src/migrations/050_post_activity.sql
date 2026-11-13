-- Notifications for posts, like Instagram's Activity.
--
-- activity_seen_at: when you last opened Activity, so the heart on Home can
-- show a dot for anything newer. like_push_at: when the owner was last
-- pushed about likes on a post, so a popular post sends at most one "liked
-- your post" an hour instead of one per like.
-- Re-runs on every deploy, and run.js skips columns that already exist.
ALTER TABLE users ADD COLUMN activity_seen_at DATETIME(6) NULL;

ALTER TABLE posts ADD COLUMN like_push_at DATETIME(6) NULL;
