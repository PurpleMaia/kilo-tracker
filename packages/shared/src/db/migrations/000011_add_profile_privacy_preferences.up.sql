ALTER TABLE profiles
  ADD COLUMN consent_privacy_ack BOOLEAN,
  ADD COLUMN share_kilo_entries BOOLEAN,
  ADD COLUMN encrypt_kilo_entries BOOLEAN;

UPDATE profiles
SET
  consent_privacy_ack = TRUE,
  share_kilo_entries = FALSE,
  encrypt_kilo_entries = TRUE
WHERE consent_privacy_ack IS NULL
  AND share_kilo_entries IS NULL
  AND encrypt_kilo_entries IS NULL;
