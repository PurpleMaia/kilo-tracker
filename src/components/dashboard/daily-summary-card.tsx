"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface TaskItem {
  id: number;
  title: string;
  priority: string;
}

interface SummaryData {
  summary: string | null;
  tasks: TaskItem[];
  kiloId: number | null;
  createdAt: string | null;
}

export function DailySummaryCard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/tasks/summary")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Today&apos;s Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-11/12 rounded bg-muted animate-pulse" />
            <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="h-3.5 w-3/5 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="h-3.5 w-2/5 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="h-3.5 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.summary) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Today&apos;s Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {data.summary}
        </p>

        {data.tasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tasks
            </p>
            <ul className="space-y-1">
              {data.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      task.priority === "high"
                        ? "bg-red-500"
                        : task.priority === "medium"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                  />
                  {task.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
