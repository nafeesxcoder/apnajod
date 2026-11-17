-- Google Play purchases the server has checked and granted.
--
-- One row per purchase token. The token is the key, so the same purchase
-- can never grant twice, even if the app sends it again. granted_at is set
-- only once Premium or the boosts are on for the member.
--
-- Safe to re-run on every deploy (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS play_purchases (
  purchase_token VARCHAR(512)  NOT NULL PRIMARY KEY,
  user_id        CHAR(36)      NOT NULL,
  plan_code      VARCHAR(40)   NOT NULL,
  product_id     VARCHAR(80)   NOT NULL,
  order_id       VARCHAR(120)  NULL,
  granted_at     DATETIME(6)   NULL,
  created_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_play_purchases_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
