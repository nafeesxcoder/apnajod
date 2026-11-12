-- Blue tick.
--
-- No new column: the tick is worked out from two things the database
-- already holds - profiles.verified (an admin approved the selfie) and a
-- running 'premium' row in entitlements (Plus or Pro is paid). Both run
-- out or get undone on their own, so the tick can never outlive either.
--
-- All this file does is tell members on the price list that Plus and Pro
-- now carry the tick and top-of-search. Re-runs on every deploy, and an
-- UPDATE to the same text is a no-op the second time.

UPDATE billing_plans
SET blurb = 'Blue tick (after selfie verification), top of search, unlimited likes, all likers, age filter, 1 boost and 2 super likes a week'
WHERE code = 'plus_monthly';

UPDATE billing_plans
SET blurb = 'Blue tick (after selfie verification), top of search, everything in Plus, 3 boosts and 5 super likes a week'
WHERE code = 'pro_monthly';
