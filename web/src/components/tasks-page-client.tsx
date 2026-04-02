"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Task = {
  id: number;
  kilo_id: number;
  title: string;
  priority: "high" | "medium" | "low";
  summary: string | null;
  created_at: string;
};

const STORAGE_KEY = "kilo-tasks-checked";

const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

const priorityStyles = {
  high: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
} as const;

const borderColors = {
  high: "border-l-rose-500",
  medium: "border-l-amber-500",
  low: "border-l-emerald-500",
} as const;

const progressColors = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
} as const;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function loadChecked(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveChecked(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export default function TasksPageClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCheckedTasks(loadChecked());
  }, []);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks?page=1&limit=50");
        if (!res.ok) throw new Error("Failed to load tasks");
        const data = await res.json();
        setTasks(data.tasks);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const toggleTask = useCallback((taskId: number) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      saveChecked(next);
      return next;
    });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const task of tasks) {
      const group = map.get(task.kilo_id);
      if (group) group.push(task);
      else map.set(task.kilo_id, [task]);
    }
    return map;
  }, [tasks]);

  if (loading) {
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

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold tracking-tight">No tasks yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Generate tasks from your KILO entries using the Sparkles button on any entry.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      {[...grouped.entries()].map(([kiloId, groupTasks]) => (
        <TaskGroupCard
          key={kiloId}
          tasks={groupTasks}
          checkedTasks={checkedTasks}
          onToggle={toggleTask}
        />
      ))}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="ghost" size="icon" className="shrink-0">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
    </div>
  );
}

function TaskGroupCard({
  tasks,
  checkedTasks,
  onToggle,
}: {
  tasks: Task[];
  checkedTasks: Set<number>;
  onToggle: (id: number) => void;
}) {
  const completedCount = tasks.filter((t) => checkedTasks.has(t.id)).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const maxPriority = tasks.reduce<"high" | "medium" | "low">((max, t) => {
    return priorityOrder[t.priority] < priorityOrder[max] ? t.priority : max;
  }, "low");

  const summary = tasks[0]?.summary;
  const date = tasks[0]?.created_at ? formatDate(tasks[0].created_at) : "";

  return (
    <Card className={`border-l-4 ${borderColors[maxPriority]} overflow-hidden`}>
      <CardHeader className="pb-3">
        {summary && (
          <p className="text-xl font-semibold tracking-tight leading-snug">{summary}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {date} &middot; {totalCount} task{totalCount !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColors[maxPriority]} rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} completed
          </p>
        </div>

        {/* Task items */}
        <div className="space-y-2">
          {tasks.map((task) => {
            const checked = checkedTasks.has(task.id);
            return (
              <label
                key={task.id}
                className="flex items-center gap-3 py-2 cursor-pointer min-h-[44px]"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(task.id)}
                  className="shrink-0"
                />
                <span
                  className={`flex-1 text-sm transition-all duration-300 ${
                    checked ? "line-through opacity-50" : ""
                  }`}
                >
                  {task.title}
                </span>
                <Badge
                  variant="secondary"
                  className={`text-xs shrink-0 ${priorityStyles[task.priority]}`}
                >
                  {task.priority}
                </Badge>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
