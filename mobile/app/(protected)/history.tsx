import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getToken } from "@/lib/api";
import { useEffect } from "react";
import { FadeIn } from "@/components/shared/fade-in";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type KiloEntry = {
  id: number;
  q1: string;
  q2: string | null;
  q3: string | null;
  created_at: string;
  has_photo: boolean;
};

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
      style={{ width: "100%", height: 160, borderRadius: 12, marginTop: 8 }}
      resizeMode="cover"
    />
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<KiloEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ entries: KiloEntry[]; total: number }>(
        "/api/kilo?page=1&limit=20"
      );
      setEntries(res.entries);
      setTotal(res.total);
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setIsLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

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
            await load();
          } catch {
            Alert.alert("Error", "Failed to delete entry.");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

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
          <Text className="text-base text-gray-500 mt-1">
            {total} {total === 1 ? "entry" : "entries"}
          </Text>
          <View className="h-px bg-gray-100 mt-4" />
        </View>
      </FadeIn>

      {entries.length === 0 ? (
        <FadeIn delay={100}>
          <View className="px-7 py-12 items-center">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
              style={{ backgroundColor: "#D1E7D5" }}
            >
              <Ionicons name="book-outline" size={26} color="#15803D" />
            </View>
            <Text className="text-gray-700 text-base font-semibold mt-1">
              No entries yet
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              Start your first kilo observation
            </Text>
          </View>
        </FadeIn>
      ) : (
        entries.map((entry, i) => (
          <FadeIn key={entry.id} delay={100 + i * 60}>
            <View
              className="mx-7 mb-3 rounded-2xl bg-gray-50 p-5"
              style={{ borderWidth: 1, borderColor: "#E7E5E4" }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-semibold text-gray-500">
                  {formatDate(entry.created_at)}
                </Text>
                <View className="flex-row items-center gap-x-3">
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/(protected)/kilo/edit?id=${entry.id}`)
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#15803D" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(entry.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: "#15803D", opacity: 0.7 }}>
                  Papahuhlilani
                </Text>
                <Text className="text-base text-gray-700 leading-6">
                  {entry.q1}
                </Text>
              </View>

              {entry.q2 && (
                <View className="mb-3 pt-3 border-t border-gray-100">
                  <Text className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: "#15803D", opacity: 0.7 }}>
                    Papahulihonua
                  </Text>
                  <Text className="text-base text-gray-700 leading-6">
                    {entry.q2}
                  </Text>
                  {entry.has_photo && <KiloPhoto entryId={entry.id} />}
                </View>
              )}

              {entry.q3 && (
                <View className="pt-3 border-t border-gray-100">
                  <Text className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: "#15803D", opacity: 0.7 }}>
                    Papahānaumoku
                  </Text>
                  <Text className="text-base text-gray-700 leading-6">
                    {entry.q3}
                  </Text>
                </View>
              )}
            </View>
          </FadeIn>
        ))
      )}
    </ScrollView>
  );
}
