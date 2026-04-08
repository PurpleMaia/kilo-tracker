/**
 * Shared profile utilities safe to import in both server and client components.
 */

import type { UserProfile } from '../types/profile';

export type { UserProfile };

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
    profile.aina?.trim()
  );
}
