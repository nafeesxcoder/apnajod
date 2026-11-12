-- Payment records outlive the account.
-- The privacy policy keeps payment records for 8 years (Indian tax law),
-- but payments.user_id cascaded, so the 30-day purge of a deleted account
-- erased its payments too. Dropping the foreign key keeps the rows. They
-- hold only an id, the plan, the amount and the Razorpay reference.
-- Idempotent: skips if the key is already gone.
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND CONSTRAINT_NAME = 'fk_payment_user'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE payments DROP FOREIGN KEY fk_payment_user',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
