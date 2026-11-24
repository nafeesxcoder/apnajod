-- A deleted pass code leaves the list and stops working. Its row stays, so the
-- members who used it keep their pass; its name is freed for a new code.
ALTER TABLE coupons ADD COLUMN deleted_at DATETIME NULL;
