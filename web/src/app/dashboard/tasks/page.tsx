import { Suspense } from "react";
import TasksPageClient from "@/components/tasks/tasks-page-client";

function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
          <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-4 w-4 bg-muted animate-pulse rounded-[4px]" />
                <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksSkeleton />}>
      <TasksPageClient />
    </Suspense>
  );
}
