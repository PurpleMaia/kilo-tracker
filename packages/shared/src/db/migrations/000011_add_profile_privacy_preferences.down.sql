ALTER TABLE profiles
  DROP COLUMN IF EXISTS encrypt_kilo_entries,
  DROP COLUMN IF EXISTS share_kilo_entries,
  DROP COLUMN IF EXISTS consent_privacy_ack;
