import { db } from "@/db/kysely/client";
import { isProfileComplete, type UserProfile } from "@/lib/profile-utils";
import { AppError } from "@/lib/errors";

export type { UserProfile } from "@/lib/profile-utils";
export { isProfileComplete } from "@/lib/profile-utils";

/**
 * Fetches a user's profile row, or null if none exists.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const profile = await db
    .selectFrom("profiles")
    .selectAll()
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!profile) return null;

  return {
    ...profile,
    dob: profile.dob ? new Date(profile.dob) : null,
  };
}

export async function requireCompleteUserProfile(userId: string): Promise<UserProfile> {
  const profile = await fetchUserProfile(userId);

  if (!profile || !isProfileComplete(profile)) {
    throw new AppError(
      "PROFILE_INCOMPLETE",
      403,
      "Complete your profile before creating a KILO entry."
    );
  }

  return profile;
}
