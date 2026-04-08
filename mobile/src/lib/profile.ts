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

  const privateEncrypted =
    profile.encrypt_kilo_entries === true && profile.share_kilo_entries === false;
  const sharedOpen =
    profile.encrypt_kilo_entries === false && profile.share_kilo_entries === true;

  return privateEncrypted || sharedOpen;
}
