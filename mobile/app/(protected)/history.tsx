import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { FadeIn } from "@/components/shared/fade-in";
import { KiloCalendar } from "@/components/history/kilo-calendar";
import { CollapsibleKiloCard } from "@/components/history/collapsible-kilo-card";

type KiloEntry = {
  id: number;
  q1: string;
  q2: string | null;
  q3: string | null;
  created_at: string;
  has_photo: boolean;
};

export default function HistoryScreen() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());

  const [entries, setEntries] = useState<KiloEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tzOffset = new Date().getTimezoneOffset();

  const loadMarkedDates = useCallback(async (year: number, month: number) => {
    try {
      const res = await apiFetch<{ dates: string[] }>(
        `/api/kilo/dates?year=${year}&month=${month}&tz=${tzOffset}`
      );
      setMarkedDates(new Set(res.dates));
    } catch {
      // silent
    }
  }, [tzOffset]);

  const loadEntries = useCallback(
    async (date: string | null) => {
      try {
        const dateParam = date ? `&date=${date}` : "";
        const res = await apiFetch<{ entries: KiloEntry[]; total: number }>(
          `/api/kilo?page=1&limit=50&tz=${tzOffset}${dateParam}`
        );
        setEntries(res.entries);
        setTotal(res.total);
      } catch {
        // silent
      }
    },
    [tzOffset]
  );

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        loadMarkedDates(currentYear, currentMonth),
        loadEntries(selectedDate),
      ]).finally(() => setIsLoading(false));
    }, [loadMarkedDates, loadEntries, currentYear, currentMonth, selectedDate])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadMarkedDates(currentYear, currentMonth),
      loadEntries(selectedDate),
    ]);
    setIsRefreshing(false);
  }, [loadMarkedDates, loadEntries, currentYear, currentMonth, selectedDate]);

  const handleChangeMonth = useCallback(
    (year: number, month: number) => {
      setCurrentYear(year);
      setCurrentMonth(month);
      setSelectedDate(null);
      loadMarkedDates(year, month);
      loadEntries(null);
    },
    [loadMarkedDates, loadEntries]
  );

  const handleSelectDate = useCallback(
    (date: string | null) => {
      setSelectedDate(date);
      loadEntries(date);
    },
    [loadEntries]
  );

  const handleDelete = (id: number) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch("/api/kilo", {
              method: "DELETE",
              body: JSON.stringify({ id }),
            });
            await Promise.all([
              loadMarkedDates(currentYear, currentMonth),
              loadEntries(selectedDate),
            ]);
          } catch {
            Alert.alert("Error", "Failed to delete entry.");
          }
        },
      },
    ]);
  };

  const handleEdit = (id: number) => {
    router.push(`/(protected)/kilo?id=${id}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  const entryLabel = selectedDate
    ? `${total} ${total === 1 ? "entry" : "entries"} on ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : `${total} ${total === 1 ? "entry" : "entries"}`;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="pb-28 pt-8"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#15803D"
        />
      }
    >
      <FadeIn>
        <View className="px-7 pt-16 pb-4">
          <Text
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: "Newsreader_400Regular" }}
          >
            Your Journal
          </Text>
          <Text className="text-base text-gray-500 mt-1">{entryLabel}</Text>
          <View className="h-px bg-gray-100 mt-4" />
        </View>
      </FadeIn>

      <FadeIn delay={80}>
        <KiloCalendar
          year={currentYear}
          month={currentMonth}
          markedDates={markedDates}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onChangeMonth={handleChangeMonth}
        />
        <View className="mx-7 h-px bg-gray-100 mb-4" />
      </FadeIn>

      {entries.length === 0 ? (
        <FadeIn delay={160}>
          <View className="px-7 py-12 items-center">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
              style={{ backgroundColor: "#D1E7D5" }}
            >
              <Ionicons name="book-outline" size={26} color="#15803D" />
            </View>
            <Text className="text-gray-700 text-base font-semibold mt-1">
              {selectedDate ? "No entries on this day" : "No entries yet"}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {selectedDate
                ? "Try selecting a different date"
                : "Start your first kilo observation"}
            </Text>
          </View>
        </FadeIn>
      ) : (
        entries.map((entry, i) => (
          <FadeIn key={entry.id} delay={160 + i * 40}>
            <CollapsibleKiloCard
              entry={entry}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showTime={!!selectedDate}
            />
          </FadeIn>
        ))
      )}
    </ScrollView>
  );
}
