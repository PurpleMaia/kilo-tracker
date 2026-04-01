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
      style={{ width: "100%", height: 160, borderRadius: 8, marginTop: 8 }}
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
      <View className="flex-1 items-center justify-center bg-koa-bg">
        <ActivityIndicator size="large" color="#B0A48E" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-koa-bg"
      contentContainerClassName="pb-28"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#B0A48E"
        />
      }
    >
      <View className="px-7 pt-16 pb-4">
        <Text
          className="text-2xl text-koa-sand"
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          Your Journal
        </Text>
        <Text className="text-sm text-koa-stone mt-1">
          {total} {total === 1 ? "entry" : "entries"}
        </Text>
        <View className="h-px bg-koa-stone/20 mt-4" />
      </View>

      {entries.length === 0 ? (
        <View className="px-7 py-12 items-center">
          <Ionicons name="book-outline" size={32} color="#B0A48E" />
          <Text className="text-koa-stone text-sm mt-3">
            No entries yet. Start your first kilo.
          </Text>
        </View>
      ) : (
        entries.map((entry) => (
          <View
            key={entry.id}
            className="mx-7 mb-4 border border-koa-stone/10 rounded-2xl bg-koa-surface p-5"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs text-koa-stone">
                {formatDate(entry.created_at)}
              </Text>
              <View className="flex-row items-center gap-x-3">
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/(protected)/kilo/edit?id=${entry.id}`)
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={15} color="#B0A48E" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(entry.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color="#D4695A" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-koa-stone mb-1">
                Internal Weather
              </Text>
              <Text className="text-sm text-koa-sand leading-5">
                {entry.q1}
              </Text>
            </View>

            {entry.q2 && (
              <View className="mb-3">
                <Text className="text-xs text-koa-stone mb-1">What I See</Text>
                <Text className="text-sm text-koa-sand leading-5">
                  {entry.q2}
                </Text>
                {entry.has_photo && <KiloPhoto entryId={entry.id} />}
              </View>
            )}

            {entry.q3 && (
              <View>
                <Text className="text-xs text-koa-stone mb-1">
                  What Excites Me
                </Text>
                <Text className="text-sm text-koa-sand leading-5">
                  {entry.q3}
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
