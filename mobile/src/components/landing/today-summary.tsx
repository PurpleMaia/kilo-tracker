import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getToken } from "@/lib/api";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ── Types ────────────────────────────────────────────────────────────

interface KiloEntry {
  id: number;
  q1: string;
  q2: string | null;
  q3: string | null;
  created_at: string;
  has_photo: boolean;
}

interface TaskItem {
  id: number;
  title: string;
  priority: string;
  status?: string;
}

interface SummaryData {
  summary: string | null;
  tasks: TaskItem[];
  kiloId: number | null;
  createdAt: string | null;
}

// ── Palette (inline styles only — tailwind handles the rest) ─────────

const PRIORITY_COLORS: Record<string, string> = {
  high: "#D4695A",
  medium: "#D4A878",
  low: "#7A9E7D",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "high",
  medium: "med",
  low: "low",
};

// ── Helpers ──────────────────────────────────────────────────────────

function truncate(text: string | null, max: number): string {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function KiloPhoto({ entryId }: { entryId: number }) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getToken();
        const res = await fetch(`${BASE_URL}/api/kilo/photo?id=${entryId}`, {
          headers: session
            ? {
                "x-session-token": session.token,
                "x-session-type": session.tokenType,
              }
            : {},
        });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) setUri(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch {
        // silently skip
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      style={{ width: "100%", height: 160, borderRadius: 12, marginTop: 10 }}
      resizeMode="cover"
    />
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center my-5">
      <View className="h-px flex-1 bg-koa-stone/15" />
      <Text className="text-xs text-koa-stone uppercase tracking-widest mx-3">
        {label}
      </Text>
      <View className="h-px flex-1 bg-koa-stone/15" />
    </View>
  );
}

function ReflectionRow({
  label,
  text,
  children,
}: {
  label: string;
  text: string | null;
  children?: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs text-koa-stone tracking-wide mb-1.5">
        {label}
      </Text>
      <Text
        className="text-sm text-koa-sand leading-6"
        style={{ fontFamily: "Newsreader_400Regular" }}
      >
        &ldquo;{truncate(text, 120)}&rdquo;
      </Text>
      {children}
    </View>
  );
}

function TaskRow({ task }: { task: TaskItem }) {
  const isDone = task.status === "done";
  const color = PRIORITY_COLORS[task.priority] ?? "#B0A48E";
  const priorityLabel = PRIORITY_LABELS[task.priority] ?? task.priority;

  return (
    <View className="flex-row items-center py-2">
      {/* Status icon */}
      <View className="w-5 items-center mr-2">
        {isDone ? (
          <Ionicons name="checkmark-circle" size={16} color="#7A9E7D" />
        ) : (
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </View>

      {/* Title */}
      <Text
        className={`flex-1 text-sm ${
          isDone ? "text-koa-stone line-through" : "text-koa-sand"
        }`}
      >
        {task.title}
      </Text>

      {/* Priority badge */}
      <View
        className="rounded-full px-2 py-0.5 ml-2"
        style={{ backgroundColor: `${color}18` }}
      >
        <Text style={{ color, fontSize: 10, fontWeight: "500" }}>
          {priorityLabel}
        </Text>
      </View>
    </View>
  );
}

function SkeletonBlock() {
  return (
    <View className="px-7 py-4">
      {/* Kilo section skeleton */}
      <View className="flex-row items-center justify-center mb-5">
        <View className="h-px flex-1 bg-koa-stone/10" />
        <View className="h-3 w-24 rounded bg-koa-stone/10 mx-3" />
        <View className="h-px flex-1 bg-koa-stone/10" />
      </View>
      <View className="gap-y-4">
        <View>
          <View className="h-2.5 w-24 rounded bg-koa-stone/10 mb-2" />
          <View className="h-4 w-full rounded bg-koa-stone/8" />
        </View>
        <View>
          <View className="h-2.5 w-20 rounded bg-koa-stone/10 mb-2" />
          <View className="h-4 w-3/4 rounded bg-koa-stone/8" />
        </View>
        <View>
          <View className="h-2.5 w-28 rounded bg-koa-stone/10 mb-2" />
          <View className="h-4 w-5/6 rounded bg-koa-stone/8" />
        </View>
      </View>

      {/* Summary section skeleton */}
      <View className="flex-row items-center justify-center my-5">
        <View className="h-px flex-1 bg-koa-stone/10" />
        <View className="h-3 w-28 rounded bg-koa-stone/10 mx-3" />
        <View className="h-px flex-1 bg-koa-stone/10" />
      </View>
      <View className="gap-y-2">
        <View className="h-3.5 w-full rounded bg-koa-stone/8" />
        <View className="h-3.5 w-11/12 rounded bg-koa-stone/8" />
        <View className="h-3.5 w-4/5 rounded bg-koa-stone/8" />
      </View>

      {/* Tasks section skeleton */}
      <View className="flex-row items-center justify-center my-5">
        <View className="h-px flex-1 bg-koa-stone/10" />
        <View className="h-3 w-12 rounded bg-koa-stone/10 mx-3" />
        <View className="h-px flex-1 bg-koa-stone/10" />
      </View>
      <View className="gap-y-2">
        <View className="flex-row items-center gap-x-2">
          <View className="h-2.5 w-2.5 rounded-full bg-koa-stone/10" />
          <View className="h-3.5 w-3/5 rounded bg-koa-stone/8" />
        </View>
        <View className="flex-row items-center gap-x-2">
          <View className="h-2.5 w-2.5 rounded-full bg-koa-stone/10" />
          <View className="h-3.5 w-2/5 rounded bg-koa-stone/8" />
        </View>
        <View className="flex-row items-center gap-x-2">
          <View className="h-2.5 w-2.5 rounded-full bg-koa-stone/10" />
          <View className="h-3.5 w-1/2 rounded bg-koa-stone/8" />
        </View>
      </View>
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function TodaySummary() {
  const [entry, setEntry] = useState<KiloEntry | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      Promise.all([
        apiFetch<{ entries: KiloEntry[]; total: number }>(
          "/api/kilo?page=1&limit=1"
        ),
        apiFetch<SummaryData>("/api/tasks/summary"),
      ])
        .then(([kiloRes, summaryRes]) => {
          const latest = kiloRes.entries[0];
          setEntry(latest && isToday(latest.created_at) ? latest : null);
          setSummary(summaryRes.summary);
          setTasks(summaryRes.tasks ?? []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  // Loading skeleton
  if (loading) {
    return <SkeletonBlock />;
  }

  // No kilo today — gentle invitation
  if (!entry) {
    return (
      <View className="px-7 py-6 items-center">
        <Ionicons name="leaf-outline" size={24} color="#7A9E7D" />
        <Text
          className="text-base text-koa-sand mt-3 text-center"
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          No observations yet today
        </Text>
        <Text className="text-xs text-koa-stone mt-1 text-center">
          Tap the kilo button below to begin
        </Text>
      </View>
    );
  }

  // Today's reflection + tasks
  return (
    <View className="px-7">
      <SectionDivider label="Today's Kilo" />

      <ReflectionRow label="Internal Weather" text={entry.q1} />

      <ReflectionRow label="What I See" text={entry.q2}>
        {entry.has_photo && <KiloPhoto entryId={entry.id} />}
      </ReflectionRow>

      <ReflectionRow label="What Excites Me" text={entry.q3} />

      {/* Edit link */}
      <TouchableOpacity
        className="flex-row items-center self-end mt-1 mb-1"
        onPress={() => router.push(`/(protected)/kilo/edit?id=${entry.id}`)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="pencil-outline" size={13} color="#B0A48E" />
        <Text className="text-xs text-koa-stone ml-1.5">Edit entry</Text>
      </TouchableOpacity>

      {/* AI-generated daily summary */}
      {summary && (
        <>
          <SectionDivider label="Today's Summary" />
          <View className="flex-row items-start mb-1">
            <Ionicons
              name="sparkles-outline"
              size={14}
              color="#D4A878"
              style={{ marginTop: 2, marginRight: 8 }}
            />
            <Text className="flex-1 text-sm text-koa-sand/80 leading-6">
              {summary}
            </Text>
          </View>
        </>
      )}

      {/* Tasks section */}
      {tasks.length > 0 && (
        <>
          <SectionDivider label="Tasks" />
          <View>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
