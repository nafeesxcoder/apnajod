-- UPI payments checked by hand.
-- A member pays to our UPI ID and sends the 12 digit UTR. The row waits as
-- pending until an admin finds the money in the bank app and approves it.
-- The UTR is provider_ref, so the unique key stops one UTR being used twice.
ALTER TABLE payments MODIFY provider ENUM('razorpay','play','manual','upi') NOT NULL;
ALTER TABLE payments MODIFY status ENUM('created','pending','paid','failed','rejected','refunded') NOT NULL DEFAULT 'created';
