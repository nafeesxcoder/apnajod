-- A new account is private: it does not turn up in username search.
--
-- The deck is deliberately unaffected. If private meant "not browsable",
-- a private-by-default app would show everyone an empty deck and nothing
-- would work. What people actually fear is being recognised by someone who
-- knows them and goes looking by name, and that is search.
ALTER TABLE users ALTER COLUMN is_private SET DEFAULT 1;

-- This file used to end with
--   UPDATE users SET is_private = 1 WHERE is_private = 0
-- to make the accounts that existed back then private once. But every
-- migration re-runs on every deploy, so that line went on to flip EVERY
-- member who later chose "public" back to private at each deploy. The one
-- conversion it was for happened long ago, and it is gone so a member's choice
-- now stays.
