import { Suspense } from "react";
import { KiloEntryFormClient } from "./KiloPage";

function KiloPageLoading() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}

export default function KiloPage() {
  return (
    <div className="mt-4 space-y-6 px-4 sm:px-0 pb-safe">
      <Suspense fallback={<KiloPageLoading />}>
        <KiloEntryFormClient />
      </Suspense>
    </div>
  );
}