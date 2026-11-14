-- Kundli match (Gun Milan, out of 36). A member may add their Rashi (1-12)
-- and Nakshatra (1-27), and say if they are Manglik. All are optional.
-- Birth date and time are never stored, only these.
-- Premium members can ask to see only people with at least a given Gun score.
ALTER TABLE profiles ADD COLUMN rashi TINYINT UNSIGNED NULL;
ALTER TABLE profiles ADD COLUMN nakshatra TINYINT UNSIGNED NULL;
ALTER TABLE profiles ADD COLUMN manglik VARCHAR(8) NULL;
ALTER TABLE matching_preferences ADD COLUMN min_gun TINYINT UNSIGNED NULL;
