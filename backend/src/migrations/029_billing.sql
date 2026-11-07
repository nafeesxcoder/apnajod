-- Paid features.
--
-- Two things get sold: a premium subscription, and boosts as a consumable
-- pack. Two rails will sell them - Razorpay on the website and Google Play
-- Billing in the Android app, because Play does not allow anything else to
-- charge for digital goods inside an app. Both rails end at the same two
-- tables below, so nothing that reads an entitlement ever learns which one
-- took the money.
--
-- Every migration here re-runs on each deploy, so each statement is written
-- to be safe the second time.

-- What can be bought. Prices live here, not in code, so changing one is a
-- single UPDATE and no deploy.
CREATE TABLE IF NOT EXISTS billing_plans (
  code          VARCHAR(40)  NOT NULL PRIMARY KEY,
  title         VARCHAR(80)  NOT NULL,
  blurb         VARCHAR(160) NULL,
  kind          ENUM('subscription','consumable') NOT NULL,
  -- What buying it gives: a feature name for a subscription ('premium'),
  -- a credit name for a consumable ('boost').
  grants        VARCHAR(40)  NOT NULL,
  -- Days for a subscription, number of credits for a consumable.
  quantity      INT          NOT NULL DEFAULT 1,
  amount_paise  INT          NOT NULL,
  currency      CHAR(3)      NOT NULL DEFAULT 'INR',
  -- The product id the same plan carries in the Play Console. Null until
  -- the app is listed there.
  play_product_id VARCHAR(80) NULL,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order    INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- What a member currently has: one row per member per feature. Buying
-- more time extends expires_at rather than adding a row.
CREATE TABLE IF NOT EXISTS entitlements (
  user_id     CHAR(36)    NOT NULL,
  feature     VARCHAR(40) NOT NULL,
  -- NULL means it never runs out (a manual grant, a lifetime plan).
  expires_at  DATETIME(6) NULL,
  source      VARCHAR(20) NOT NULL DEFAULT 'manual',
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, feature),
  KEY idx_entitlement_expiry (feature, expires_at),
  CONSTRAINT fk_entitlement_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Consumables a member is holding, such as unused boosts.
CREATE TABLE IF NOT EXISTS credit_balances (
  user_id    CHAR(36)    NOT NULL,
  kind       VARCHAR(40) NOT NULL,
  balance    INT         NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, kind),
  CONSTRAINT fk_credit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_credit_not_negative CHECK (balance >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every payment attempt, whichever rail. The unique key on
-- (provider, provider_ref) is what makes granting idempotent: a webhook
-- that arrives three times, as webhooks do, grants once.
CREATE TABLE IF NOT EXISTS payments (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  user_id       CHAR(36)     NOT NULL,
  plan_code     VARCHAR(40)  NOT NULL,
  provider      ENUM('razorpay','play','manual') NOT NULL,
  -- Razorpay order id, or the Play purchase token.
  provider_ref  VARCHAR(255) NOT NULL,
  amount_paise  INT          NOT NULL,
  currency      CHAR(3)      NOT NULL DEFAULT 'INR',
  status        ENUM('created','paid','failed','refunded') NOT NULL DEFAULT 'created',
  -- Set the moment the grant is applied, so a replayed webhook can tell
  -- "already paid" from "paid and granted".
  granted_at    DATETIME(6)  NULL,
  notes         TEXT         NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uniq_payment_ref (provider, provider_ref),
  KEY idx_payment_user (user_id, created_at),
  CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A boost that is running or has run. The deck reads the live one.
CREATE TABLE IF NOT EXISTS boosts (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  ends_at    DATETIME(6) NOT NULL,
  KEY idx_boost_live (ends_at, user_id),
  CONSTRAINT fk_boost_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Opening prices. India is price-sensitive and short packs outsell long
-- ones, so the weekly is the one most people will take. Change an amount
-- with an UPDATE and nothing in code hardcodes it.
INSERT INTO billing_plans
  (code, title, blurb, kind, grants, quantity, amount_paise, sort_order)
VALUES
  ('premium_weekly',  'Premium - 1 week',   'Unlimited likes, see everyone who liked you, all filters', 'subscription', 'premium', 7,   9900, 10),
  ('premium_monthly', 'Premium - 1 month',  'Everything in Premium, better value',                      'subscription', 'premium', 30, 29900, 20),
  ('premium_quarter', 'Premium - 3 months', 'Everything in Premium, best value',                        'subscription', 'premium', 90, 69900, 30),
  ('boost_1',         '1 Boost',            'Top of the deck for 30 minutes',                           'consumable',   'boost',   1,   4900, 40),
  ('boost_5',         '5 Boosts',           'Five turns at the top of the deck',                        'consumable',   'boost',   5,  19900, 50)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  blurb = VALUES(blurb),
  kind = VALUES(kind),
  grants = VALUES(grants),
  quantity = VALUES(quantity),
  sort_order = VALUES(sort_order);
