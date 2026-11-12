-- Weekly Boosts and Super Likes for Plus and Pro.
--
-- Plus promises 1 boost and 2 super likes a week, Pro 3 and 5. One row per
-- member per week (Monday, India time) records that the week's credits were
-- handed out, so they are given once - the primary key refuses a second
-- row even when two requests arrive together. `plan` says which plan they
-- were given for, so moving from Plus to Pro mid-week tops up the
-- difference instead of paying out twice.
--
-- Re-runs on every deploy. CREATE TABLE IF NOT EXISTS is safe the second time.

CREATE TABLE IF NOT EXISTS weekly_allowance_grants (
  user_id    CHAR(36)    NOT NULL,
  week_start DATE        NOT NULL,
  plan       VARCHAR(20) NOT NULL,
  granted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, week_start),
  CONSTRAINT fk_weekly_grant_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
