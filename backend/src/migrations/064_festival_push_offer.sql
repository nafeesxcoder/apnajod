-- Festival themes, part two: a Premium offer while the festival is on
-- (a percent off every plan) and the greeting push to everyone, which
-- goes once per festival so a double click cannot send it twice.
ALTER TABLE festival_schedule ADD COLUMN offer_percent TINYINT UNSIGNED NULL;
ALTER TABLE festival_schedule ADD COLUMN pushed_at DATETIME NULL;
