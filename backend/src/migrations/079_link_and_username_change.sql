-- A link on your profile (shown under About), and when the username last
-- changed: a second change is allowed 15 days after the first.
ALTER TABLE profiles ADD COLUMN link VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN username_changed_at DATETIME(6) NULL;
