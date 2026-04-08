import { isProfileComplete } from "@kilo/shared/lib";
import type { UserProfile } from "@kilo/shared/types";
import { apiFetch } from "@/lib/api";

export type MobileUserProfile = UserProfile | null;

export async function fetchProfile(): Promise<MobileUserProfile> {
  const res = await apiFetch<{ profile: UserProfile | null }>("/api/profile");
  return res.profile;
}

export function isMobileProfileComplete(profile: MobileUserProfile): boolean {
  if (!isProfileComplete(profile)) return false;
  if (!profile?.consent_privacy_ack) return false;

  const encryptSelected = profile.encrypt_kilo_entries === true;
  const shareSelected = profile.share_kilo_entries === true;
  const hasExactlyOneStorageChoice = encryptSelected !== shareSelected;

  return hasExactlyOneStorageChoice;
}
