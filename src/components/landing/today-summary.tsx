import { useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { KiloPhoto } from "@/components/shared/kilo-photo";

// ── Types ────────────────────────────────────────────────────────────

interface KiloEntry {
  id: number;
  q1: string;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  created_at: string;
  q1_photo_path: string | null;
  q2_photo_path: string | null;
  q3_photo_path: string | null;
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

// ── Palette ─────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  high: "#B91C1C",
  medium: "#D97706",
  low: "#15803D",
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

function SectionDivider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center my-5">
      <View className="h-px flex-1 bg-gray-100" />
      <Text className="text-sm font-bold uppercase tracking-widest mx-3" style={{ color: "#15803D", opacity: 0.7 }}>
        {label}
      </Text>
      <View className="h-px flex-1 bg-gray-100" />
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
      <Text className="text-sm font-bold uppercase tracking-wide mb-1.5" style={{ color: "#15803D", opacity: 0.7 }}>
        {label}
      </Text>
      <Text
        className="text-base text-gray-700 leading-6"
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
  const color = PRIORITY_COLORS[task.priority] ?? "#78716C";
  const priorityLabel = PRIORITY_LABELS[task.priority] ?? task.priority;

  return (
    <View className="flex-row items-center py-2">
      <View className="w-5 items-center mr-2">
        {isDone ? (
          <Ionicons name="checkmark-circle" size={16} color="#15803D" />
        ) : (
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </View>

      <Text
        className={`flex-1 text-base ${
          isDone ? "text-gray-400 line-through" : "text-gray-700"
        }`}
      >
        {task.title}
      </Text>

      <View
        className="rounded-full px-2 py-0.5 ml-2"
        style={{ backgroundColor: `${color}18` }}
      >
        <Text style={{ color, fontSize: 11, fontWeight: "600" }}>
          {priorityLabel}
        </Text>
      </View>
    </View>
  );
}

function SkeletonBlock() {
  return (
    <View className="px-7 py-4">
      <View className="flex-row items-center justify-center mb-5">
        <View className="h-px flex-1 bg-gray-100" />
        <View className="h-3 w-24 rounded-full bg-gray-100 mx-3" />
        <View className="h-px flex-1 bg-gray-100" />
      </View>
      <View className="gap-y-4">
        <View>
          <View className="h-2.5 w-24 rounded-full bg-gray-100 mb-2" />
          <View className="h-4 w-full rounded-full bg-gray-50" />
        </View>
        <View>
          <View className="h-2.5 w-20 rounded-full bg-gray-100 mb-2" />
          <View className="h-4 w-3/4 rounded-full bg-gray-50" />
        </View>
        <View>
          <View className="h-2.5 w-28 rounded-full bg-gray-100 mb-2" />
          <View className="h-4 w-5/6 rounded-full bg-gray-50" />
        </View>
      </View>

      <View className="flex-row items-center justify-center my-5">
        <View className="h-px flex-1 bg-gray-100" />
        <View className="h-3 w-28 rounded-full bg-gray-100 mx-3" />
        <View className="h-px flex-1 bg-gray-100" />
      </View>
      <View className="gap-y-2">
        <View className="h-3.5 w-full rounded-full bg-gray-50" />
        <View className="h-3.5 w-11/12 rounded-full bg-gray-50" />
        <View className="h-3.5 w-4/5 rounded-full bg-gray-50" />
      </View>

      <View className="flex-row items-center justify-center my-5">
        <View className="h-px flex-1 bg-gray-100" />
        <View className="h-3 w-12 rounded-full bg-gray-100 mx-3" />
        <View className="h-px flex-1 bg-gray-100" />
      </View>
      <View className="gap-y-2">
        <View className="flex-row items-center gap-x-2">
          <View className="h-2.5 w-2.5 rounded-full bg-gray-100" />
          <View className="h-3.5 w-3/5 rounded-full bg-gray-50" />
        </View>
        <View className="flex-row items-center gap-x-2">
          <View className="h-2.5 w-2.5 rounded-full bg-gray-100" />
          <View className="h-3.5 w-2/5 rounded-full bg-gray-50" />
        </View>
      </View>
    </View>
  );
}

function SummarySkeletonBlock() {
  return (
    <>
      <SectionDivider label="Today's Summary" />
      <View className="gap-y-2">
        <View className="h-3.5 w-full rounded-full bg-gray-50" />
        <View className="h-3.5 w-11/12 rounded-full bg-gray-50" />
        <View className="h-3.5 w-4/5 rounded-full bg-gray-50" />
      </View>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function TodaySummary() {
  const [entry, setEntry] = useState<KiloEntry | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoadingEntry, setIsLoadingEntry] = useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const latestEntryIdRef = useRef<number | null>(null);

  const fetchData = useCallback(async (): Promise<KiloEntry | null> => {
    try {
      const kiloRes = await apiFetch<{ entries: KiloEntry[]; total: number }>(
        "/api/kilo?page=1&limit=1"
      );

      const latest = kiloRes.entries[0];
      const todayEntry = latest && isToday(latest.created_at) ? latest : null;
      setEntry(todayEntry);
      return todayEntry;
    } catch (err) {
      if (__DEV__) console.error("Failed to fetch kilo entry:", err);
      setEntry(null);
      return null;
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const summaryRes = await apiFetch<SummaryData>("/api/tasks/summary");
      setSummary(summaryRes.summary);
      setTasks(summaryRes.tasks ?? []);
    } catch (err) {
      if (__DEV__) console.error("Failed to fetch summary:", err);
      setSummary(null);
      setTasks([]);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const refreshCard = useCallback(async () => {
    setIsLoadingEntry(true);
    const todayEntry = await fetchData();
    setIsLoadingEntry(false);

    const nextEntryId = todayEntry?.id ?? null;
    const entryChanged = latestEntryIdRef.current !== nextEntryId;
    latestEntryIdRef.current = nextEntryId;

    if (!todayEntry) {
      setSummary(null);
      setTasks([]);
      return;
    }

    if (entryChanged || !summary) {
      await fetchSummary();
    }
  }, [fetchData, fetchSummary, summary]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      refreshCard();

      const interval = setInterval(async () => {
        if (!active) return;
        const latestEntry = await fetchData();
        const nextEntryId = latestEntry?.id ?? null;

        if (latestEntryIdRef.current !== nextEntryId) {
          latestEntryIdRef.current = nextEntryId;

          if (!latestEntry) {
            setSummary(null);
            setTasks([]);
            return;
          }

          await fetchSummary();
        }
      }, 15000);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [refreshCard, fetchData, fetchSummary])
  );

  const handleRegenerate = async () => {
    setRegenerating(true);
    const todayEntry = await fetchData();
    latestEntryIdRef.current = todayEntry?.id ?? null;
    if (todayEntry) {
      await fetchSummary();
    } else {
      setSummary(null);
      setTasks([]);
    }
    setRegenerating(false);
  };

  if (isLoadingEntry) {
    return <SkeletonBlock />;
  }

  if (!entry) {
    return (
      <View className="px-7 py-8 items-center">
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
          style={{ backgroundColor: "#D1E7D5" }}
        >
          <Ionicons name="leaf-outline" size={26} color="#15803D" />
        </View>
        <Text
          className="text-lg text-gray-900 mt-1 text-center font-semibold"
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          No observations yet today
        </Text>
        <Text className="text-sm text-gray-500 mt-1 text-center">
          Tap the kilo button below to begin
        </Text>
      </View>
    );
  }

  return (
    <View className="px-7">
      <SectionDivider label="Today's Kilo" />

      <ReflectionRow label="Papahulilani" text={entry.q1}>
        {entry.q1_photo_path && <KiloPhoto entryId={entry.id} question="q1" />}
      </ReflectionRow>

      <ReflectionRow label="Papahulihonua" text={entry.q2}>
        {entry.q2_photo_path && <KiloPhoto entryId={entry.id} question="q2" />}
      </ReflectionRow>

      <ReflectionRow label="Papahānaumoku" text={entry.q3}>
        {entry.q3_photo_path && <KiloPhoto entryId={entry.id} question="q3" />}
      </ReflectionRow>

      {entry.q4 && (
        <ReflectionRow label="Naʻau" text={entry.q4} />
      )}

      <TouchableOpacity
        className="flex-row items-center self-end mt-1 mb-1"
        onPress={() => router.push(`/(protected)/kilo/edit?id=${entry.id}`)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="pencil-outline" size={14} color="#15803D" />
        <Text className="text-sm font-semibold ml-1.5" style={{ color: "#15803D" }}>Edit entry</Text>
      </TouchableOpacity>

      {/* {summary && (
        <>
          <SectionDivider label="Today's Summary" />
          <View className="flex-row items-start mb-1">
            <Ionicons
              name="sparkles-outline"
              size={15}
              color="#D97706"
              style={{ marginTop: 2, marginRight: 8 }}
            />
            <Text className="flex-1 text-base text-gray-500 leading-6">
              {summary}
            </Text>
          </View>
        </>
      )} */}

      {/* {isLoadingSummary && (
        <SummarySkeletonBlock />
      )} */}

      {/* <TouchableOpacity
        className="flex-row items-center justify-center mt-4 mb-2 py-2"
        onPress={handleRegenerate}
        disabled={regenerating || isLoadingSummary}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {regenerating || isLoadingSummary ? (
          <ActivityIndicator size="small" color="#15803D" />
        ) : (
          <Ionicons name="refresh-outline" size={14} color="#78716C" />
        )}
        <Text className="text-sm ml-1.5" style={{ color: "#78716C" }}>
          {regenerating || isLoadingSummary ? "Regenerating…" : "Regenerate summary"}
        </Text>
      </TouchableOpacity>

      {tasks.length > 0 && (
        <>
          <SectionDivider label="Tasks" />
          <View>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </View>
        </>
      )} */}
    </View>
  );
}
