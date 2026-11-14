-- Coupons the admin writes (DIWALI50 and the like) and the offer popup.
-- A member can use a coupon once: coupon_redemptions has one row per
-- coupon and member, written when the payment is approved.
-- The payment remembers which coupon priced it.
-- One offer popup is on at a time and shows each time the app opens.
CREATE TABLE IF NOT EXISTS coupons (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  percent TINYINT UNSIGNED NOT NULL,
  valid_until DATETIME NULL,
  max_uses INT UNSIGNED NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  show_at_checkout TINYINT(1) NOT NULL DEFAULT 0,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY coupon_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  coupon_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  payment_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (coupon_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE payments ADD COLUMN coupon_code VARCHAR(40) NULL;

CREATE TABLE IF NOT EXISTS promo_popups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  headline VARCHAR(40) NOT NULL,
  title VARCHAR(80) NULL,
  message VARCHAR(200) NULL,
  button_label VARCHAR(40) NULL,
  coupon_code VARCHAR(40) NULL,
  style VARCHAR(40) NOT NULL DEFAULT 'classic',
  ends_at DATETIME NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
