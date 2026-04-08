import { isProfileComplete } from "@kilo/shared/lib";
import type { UserProfile } from "@kilo/shared/types";
import { apiFetch } from "@/lib/api";

export type MobileUserProfile = UserProfile | null;

export async function fetchProfile(): Promise<MobileUserProfile> {
  const res = await apiFetch<{ profile: UserProfile | null }>("/api/profile");
  return res.profile;
}

export function isMobileProfileComplete(profile: MobileUserProfile): boolean {
  return isProfileComplete(profile);
}
