import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { fetchUserProfile, isProfileComplete } from "@/lib/data/profile";
import { ProfileOnboarding } from "@/components/onboarding/ProfileOnboarding";

export default async function OnboardingPage() {
  const user = await getAuthUser();
  const profile = await fetchUserProfile(user.id);

  if (isProfileComplete(profile)) {
    redirect("/dashboard");
  }

  return <ProfileOnboarding user={user} initialProfile={profile} />;
}
