-- One row per member per India day they used the app.
--
-- users.last_active_at only keeps the latest moment, so it can say who is
-- active now but not how many people came back yesterday, or the day
-- before. This table is what the admin Growth page draws daily active
-- members from. Written by the auth middleware at most once a day per
-- member. Counting starts the day this is deployed.
--
-- Re-runs on every deploy - CREATE TABLE IF NOT EXISTS is safe the second time.

CREATE TABLE IF NOT EXISTS member_active_days (
  user_id CHAR(36) NOT NULL,
  day     DATE     NOT NULL,
  PRIMARY KEY (user_id, day),
  INDEX idx_active_day (day),
  CONSTRAINT fk_active_day_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
