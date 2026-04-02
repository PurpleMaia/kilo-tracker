import { db } from "@/db/kysely/client";
import type { UserProfile } from "@/lib/profile-utils";

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
