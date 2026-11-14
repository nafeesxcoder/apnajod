-- "Hide activity status" in Safety Center: when on, nobody sees whether
-- this member is online or when they were last active, and like Instagram
-- they do not see anyone else's either. Re-runs on every deploy, a second
-- run is skipped as a duplicate column.
ALTER TABLE users ADD COLUMN hide_activity TINYINT(1) NOT NULL DEFAULT 0;
