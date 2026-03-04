/**
 * Shared profile utilities safe to import in both server and client components.
 */

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
};

/**
 * Returns true if all required profile fields are filled.
 */
export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return !!(
    profile.first_name?.trim() &&
    profile.last_name?.trim() &&
    profile.dob &&
    profile.mauna?.trim() &&
    profile.aina?.trim() &&
    profile.wai?.trim() &&
    profile.kula?.trim() &&
    profile.role?.trim()
  );
}
