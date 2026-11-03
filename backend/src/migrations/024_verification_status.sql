ALTER TABLE profiles 
ADD COLUMN verification_status ENUM('none', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'none';