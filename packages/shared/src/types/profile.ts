export type UserProfile = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: Date | string | null;
  mokupuni: string | null;
  mauna: string | null;
  aina: string | null;
  wai: string | null;
  kula: string | null;
  role: string | null;
  consent_privacy_ack: boolean | null;
  share_kilo_entries: boolean | null;
  encrypt_kilo_entries: boolean | null;
};
