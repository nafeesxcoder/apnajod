-- Sparks, Super Likes and the Daily Question.
--
-- match_sparks records every Spark and Super Like a member sends. A Spark
-- is free - one a day, plus one for each daily question answered. A Super
-- Like is paid, from the packs on the Premium screen. Both put the sender
-- at the top of the other person's Likes with their note.
--
-- free_day is set only on the day's free Spark. With the unique key on
-- (actor_id, free_day) a second free Spark the same day cannot be written,
-- even when two taps arrive together. Rows paid with a credit leave it
-- NULL, and MySQL lets any number of NULLs share a unique key.
--
-- Re-runs on every deploy. CREATE TABLE IF NOT EXISTS and INSERT IGNORE
-- make every statement safe the second time.

CREATE TABLE IF NOT EXISTS match_sparks (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  actor_id   CHAR(36)    NOT NULL,
  target_id  CHAR(36)    NOT NULL,
  kind       ENUM('spark','superlike') NOT NULL,
  paid_with  ENUM('free','credit')     NOT NULL,
  free_day   DATE        NULL,
  note       VARCHAR(140) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_spark_actor  FOREIGN KEY (actor_id)  REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_spark_target FOREIGN KEY (target_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE KEY uniq_spark_free_day (actor_id, free_day),
  UNIQUE KEY uniq_spark_pair_kind (actor_id, target_id, kind),
  INDEX idx_spark_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_questions (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question   VARCHAR(200) NOT NULL,
  options    JSON         NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uniq_daily_question (question)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_question_answers (
  user_id      CHAR(36)    NOT NULL,
  answered_day DATE        NOT NULL,
  question_id  INT         NOT NULL,
  answer       VARCHAR(80) NOT NULL,
  created_at   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, answered_day),
  CONSTRAINT fk_dqa_user     FOREIGN KEY (user_id)     REFERENCES users (id)           ON DELETE CASCADE,
  CONSTRAINT fk_dqa_question FOREIGN KEY (question_id) REFERENCES daily_questions (id) ON DELETE CASCADE,
  INDEX idx_dqa_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A starting set. Admins add more from the dashboard. INSERT IGNORE skips
-- any question already there, so an admin's edits are never overwritten.
INSERT IGNORE INTO daily_questions (question, options) VALUES
  ('After marriage, where would you like to live?', JSON_ARRAY('With family', 'On our own', 'Near family', 'Wherever work takes us')),
  ('Your ideal first date?', JSON_ARRAY('Coffee and a long talk', 'Dinner out', 'A walk somewhere green', 'Street food crawl')),
  ('How soon do you want to get married?', JSON_ARRAY('Within a year', 'In 1-2 years', 'In 3+ years', 'Not sure yet')),
  ('A perfect Sunday looks like...', JSON_ARRAY('Lazy at home', 'Out with friends', 'Family time', 'A short trip')),
  ('How do you handle a fight?', JSON_ARRAY('Talk it out right away', 'Cool off, then talk', 'Let it go', 'Write it down first')),
  ('Should both partners work after marriage?', JSON_ARRAY('Yes, both', 'Whoever wants to', 'One of us', 'Decide together later')),
  ('Pick a holiday', JSON_ARRAY('Mountains', 'Beach', 'A new city', 'Home town')),
  ('How important is religion in your daily life?', JSON_ARRAY('Very', 'Somewhat', 'A little', 'Not at all')),
  ('Your love language?', JSON_ARRAY('Time together', 'Kind words', 'Gifts', 'Doing things for them')),
  ('Kids in the future?', JSON_ARRAY('Yes, soon', 'Yes, later', 'Maybe', 'No')),
  ('Morning person or night owl?', JSON_ARRAY('Morning person', 'Night owl', 'Depends on the day', 'Neither, always tired')),
  ('What matters most in a partner?', JSON_ARRAY('Honesty', 'Kindness', 'Ambition', 'Sense of humour'));
