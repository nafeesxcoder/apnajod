-- The state of each Google Play subscription, as Google last reported it.
--
-- One row per purchase token. Google's real-time notifications update it on
-- every renewal, cancellation, expiry or hold, so the app can show whether
-- auto-renew is on and when Premium next renews.
--
-- Safe to re-run on every deploy (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS play_subscriptions (
  purchase_token VARCHAR(512) NOT NULL PRIMARY KEY,
  user_id        CHAR(36)     NOT NULL,
  product_id     VARCHAR(80)  NOT NULL,
  state          VARCHAR(60)  NOT NULL,
  auto_renew     TINYINT(1)   NOT NULL DEFAULT 0,
  expires_at     DATETIME(6)  NULL,
  updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_play_subscriptions_user (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
