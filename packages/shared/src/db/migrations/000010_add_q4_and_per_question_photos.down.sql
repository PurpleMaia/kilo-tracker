ALTER TABLE kilo ADD COLUMN photo_path TEXT;
UPDATE kilo SET photo_path = q1_photo_path WHERE q1_photo_path IS NOT NULL;
ALTER TABLE kilo DROP COLUMN q1_photo_path;
ALTER TABLE kilo DROP COLUMN q2_photo_path;
ALTER TABLE kilo DROP COLUMN q3_photo_path;
ALTER TABLE kilo DROP COLUMN q4;
