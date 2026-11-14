-- A date plan can now be "completed": someone tapped "I'm safe" after the
-- date. Safe to run again on every deploy (it sets the same list).
ALTER TABLE date_proposals MODIFY status ENUM('proposed','accepted','declined','cancelled','completed') NOT NULL DEFAULT 'proposed';
