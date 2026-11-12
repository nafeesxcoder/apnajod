-- Blue tick - Pro only.
--
-- No new column: the tick is worked out from two things the database
-- already holds - profiles.verified (an admin approved the selfie) and a
-- running 'pro' row in entitlements. Both run out or get undone on their
-- own, so the tick can never outlive either.
--
-- Pro grants its own 'pro' entitlement. Every premium gate (likes, likers,
-- age filter) accepts 'premium' or 'pro', so Pro keeps everything Plus has.
-- Re-runs on every deploy, and every statement is safe the second time.

UPDATE billing_plans SET grants = 'pro' WHERE code = 'pro_monthly';

UPDATE billing_plans
SET blurb = 'Unlimited likes, all likers, age filter, 1 boost and 2 super likes a week'
WHERE code = 'plus_monthly';

UPDATE billing_plans
SET blurb = 'Blue tick (after selfie verification), top of search, everything in Plus, 3 boosts and 5 super likes a week'
WHERE code = 'pro_monthly';

-- Anyone who bought Pro before this change was granted 'premium'. Give them
-- the matching 'pro' row so they get their tick. Only members with a Pro
-- payment in the last 31 days and no 'pro' row yet, so a re-run never
-- stretches anyone's plan.
INSERT INTO entitlements (user_id, feature, expires_at, source)
SELECT e.user_id, 'pro', e.expires_at, 'migrated'
  FROM entitlements e
 WHERE e.feature = 'premium'
   AND (e.expires_at IS NULL OR e.expires_at > UTC_TIMESTAMP(6))
   AND EXISTS (
     SELECT 1 FROM payments p
      WHERE p.user_id = e.user_id
        AND p.plan_code = 'pro_monthly'
        AND p.status = 'paid'
        AND p.granted_at > UTC_TIMESTAMP(6) - INTERVAL 31 DAY
   )
   AND NOT EXISTS (
     SELECT 1 FROM entitlements x
      WHERE x.user_id = e.user_id AND x.feature = 'pro'
   );
