-- Aaj ke 5 - five hand-picked profiles a day, new at 9 PM India time.
--
-- daily_picks holds each member's five for a pick day, with a snapshot of
-- the card so the set stays the same all day even after they like or pass
-- (the deck query hides anyone already decided on). The primary key on
-- (user, day, position) means two requests building the set at the same
-- moment cannot make ten picks, and the unique key stops one person
-- appearing twice in a set.
--
-- daily_pick_notices records the 9 PM "your picks are ready" push, once per
-- member per day.
--
-- Re-runs on every deploy. CREATE TABLE IF NOT EXISTS is safe the second time.

CREATE TABLE IF NOT EXISTS daily_picks (
  user_id    CHAR(36)    NOT NULL,
  pick_day   DATE        NOT NULL,
  position   TINYINT     NOT NULL,
  target_id  CHAR(36)    NOT NULL,
  card       JSON        NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, pick_day, position),
  UNIQUE KEY uniq_daily_pick_target (user_id, pick_day, target_id),
  CONSTRAINT fk_daily_pick_user   FOREIGN KEY (user_id)   REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_pick_target FOREIGN KEY (target_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_daily_pick_recent (user_id, target_id, pick_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_pick_notices (
  user_id  CHAR(36)    NOT NULL,
  pick_day DATE        NOT NULL,
  sent_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, pick_day),
  CONSTRAINT fk_daily_pick_notice_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
