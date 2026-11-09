-- Phase 1 pricing — Free / Plus ₹99 / Pro ₹249 + Boost & Super Like packs.
-- Re-runs on every deploy (npm run migrate replays every file), so every
-- statement is written to be safe the second time.
--
-- This is a NEW migration, not an edit of 029_billing.sql:
--   029 created the tables and inserted the old premium_weekly/monthly/quarter
--       plans. Those rows are still referenced by existing payments rows, so
--       they are deactivated here, never deleted.
--   031 does three things:
--       (a) old premium_* plans -> active = 0
--       (b) Plus / Pro subscriptions upserted
--       (c) Boost + Super Like consumable packs upserted

-- (a) Deactivate old premium_* plans. Do NOT delete: old payments reference them.
UPDATE billing_plans
SET active = 0
WHERE code IN ('premium_weekly', 'premium_monthly', 'premium_quarter');

-- (b) Subscriptions — Plus ₹99/month, Pro ₹249/month
INSERT INTO billing_plans
  (code, title, blurb, kind, grants, quantity, amount_paise, active, sort_order)
VALUES
  ('plus_monthly', 'Plus',
   'Unlimited likes, all likers, age filter, 1 boost/week, 2 super likes/week',
   'subscription', 'premium', 30, 9900, 1, 10),
  ('pro_monthly', 'Pro',
   'Everything in Plus, 3 boosts/week, 5 super likes/week',
   'subscription', 'premium', 30, 24900, 1, 20)
ON DUPLICATE KEY UPDATE
  title        = VALUES(title),
  blurb        = VALUES(blurb),
  kind         = VALUES(kind),
  grants       = VALUES(grants),
  quantity     = VALUES(quantity),
  amount_paise = VALUES(amount_paise),
  active       = 1,
  sort_order   = VALUES(sort_order);

-- (c) Consumable packs — boosts (already existed in 029, re-upserted for safety)
--     and super likes (NEW — no rows existed for these before 031)
INSERT INTO billing_plans
  (code, title, blurb, kind, grants, quantity, amount_paise, active, sort_order)
VALUES
  ('boost_1',     '1 Boost',      'One boost to reach the top of the deck', 'consumable', 'boost',      1,  4900, 1, 30),
  ('boost_5',     '5 Boosts',     'Five boosts, save ₹46',                   'consumable', 'boost',      5, 19900, 1, 31),
  ('superlike_1', '1 Super Like', 'Stand out with one super like',           'consumable', 'superlike',  1,  2900, 1, 40),
  ('superlike_5', '5 Super Likes','Five super likes, save ₹26',              'consumable', 'superlike',  5, 11900, 1, 41)
ON DUPLICATE KEY UPDATE
  title        = VALUES(title),
  blurb        = VALUES(blurb),
  kind         = VALUES(kind),
  grants       = VALUES(grants),
  quantity     = VALUES(quantity),
  amount_paise = VALUES(amount_paise),
  active       = 1,
  sort_order   = VALUES(sort_order);