-- Accounts are public by default now, like Instagram: your posts show on
-- everyone's Home feed and you turn up in username search. Anyone who
-- wants to be private switches it on in Settings, and then only their
-- matches see their posts.
--
-- Runs after 028 (which set the default to private) on every deploy, so the
-- default ends up public.
ALTER TABLE users ALTER COLUMN is_private SET DEFAULT 0;

-- Once only: make every existing account public. They were all private
-- because 028 used to reset everyone at each deploy, not because members
-- chose it. Migrations re-run on every deploy, so this records that it has
-- run, and never touches anyone again - a member who goes private later
-- stays private.
CREATE TABLE IF NOT EXISTS one_time_jobs (
  name VARCHAR(64) PRIMARY KEY,
  ran_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE users SET is_private = 0
 WHERE is_private = 1
   AND NOT EXISTS (SELECT 1 FROM one_time_jobs WHERE name = '048_everyone_public');

INSERT IGNORE INTO one_time_jobs (name) VALUES ('048_everyone_public');
