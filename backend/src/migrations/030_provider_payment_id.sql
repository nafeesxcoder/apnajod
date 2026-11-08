-- Razorpay payment id, for reconciliation and refunds.
-- Idempotent: skips if column already exists.
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'provider_payment_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE payments ADD COLUMN provider_payment_id VARCHAR(255) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
