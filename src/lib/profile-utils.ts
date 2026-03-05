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
      (typeof profile.dob === 'string'
        ? profile.dob.trim().length > 0
        : !Number.isNaN((profile.dob as Date).getTime())) &&
    profile.mauna?.trim() &&
    profile.aina?.trim() &&
    profile.wai?.trim() &&
    profile.kula?.trim() &&
    profile.role?.trim()
  );
}
