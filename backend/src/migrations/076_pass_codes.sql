-- Coupons become pass codes: payment is only through Google Play, which
-- takes no coupons, so a code now gives a free pass (plan + months) instead
-- of money off. Old percent coupons stay in the table but no longer work.
ALTER TABLE coupons ADD COLUMN pass_plan VARCHAR(20) NULL;
ALTER TABLE coupons ADD COLUMN pass_months TINYINT UNSIGNED NULL;
