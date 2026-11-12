-- Pose selfie verification.
--
-- The member is handed one random pose before taking the selfie, and the
-- reviewer checks the selfie shows it. The pose code stays on the row for
-- the reviewer, and issued_at is cleared once a selfie is submitted against it,
-- so one pose cannot be used twice. Re-runs on every deploy, and run.js
-- skips a column that already exists.

ALTER TABLE profiles ADD COLUMN verification_pose VARCHAR(40) NULL;

ALTER TABLE profiles ADD COLUMN verification_pose_issued_at DATETIME NULL;
