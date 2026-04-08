import { Suspense } from "react";
import { redirect } from "next/navigation";
import { KiloEntryFormClient } from "./KiloPage";
import { getAuthUser } from "@/lib/auth/session";
import { fetchUserProfile, isProfileComplete } from "@/lib/data/profile";

function KiloPageLoading() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}

export default async function KiloPage() {
  const user = await getAuthUser();
  const profile = await fetchUserProfile(user.id);

  if (!isProfileComplete(profile)) {
    redirect("/dashboard/onboarding");
  }

  return (
    <div className="mt-4 space-y-6 px-4 sm:px-0 pb-safe">
      <Suspense fallback={<KiloPageLoading />}>
        <KiloEntryFormClient />
      </Suspense>
    </div>
  );
}
