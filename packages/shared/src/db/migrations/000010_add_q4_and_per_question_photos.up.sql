ALTER TABLE kilo ADD COLUMN q4 TEXT;
ALTER TABLE kilo ADD COLUMN q1_photo_path TEXT;
ALTER TABLE kilo ADD COLUMN q2_photo_path TEXT;
ALTER TABLE kilo ADD COLUMN q3_photo_path TEXT;
UPDATE kilo SET q1_photo_path = photo_path WHERE photo_path IS NOT NULL;
ALTER TABLE kilo DROP COLUMN photo_path;
