-- A new account is private: it does not turn up in username search.
--
-- The deck is deliberately unaffected. If private meant "not browsable",
-- a private-by-default app would show everyone an empty deck and nothing
-- would work. What people actually fear is being recognised by someone who
-- knows them and goes looking by name, and that is search.
ALTER TABLE users ALTER COLUMN is_private SET DEFAULT 1;

UPDATE users SET is_private = 1 WHERE is_private = 0;
