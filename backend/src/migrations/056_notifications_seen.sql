-- When the member last opened Notifications (the Home bell).
--
-- The bell counts likes, like-backs, Sparks and Super Likes that arrived
-- after this moment. Empty means they never opened it. Re-runs on every
-- deploy, a second run is skipped as a duplicate column.
ALTER TABLE users ADD COLUMN notifications_seen_at DATETIME(6) NULL;
