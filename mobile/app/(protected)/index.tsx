import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type OleloNoeau = { id: number; text: string } | null;

type KiloEntry = {
  id: number;
  q1: string;
  q2: string | null;
  q3: string | null;
  created_at: string;
  has_photo: boolean;
};

type DashboardData = {
  olelo: OleloNoeau;
  entries: KiloEntry[];
  total: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [oleloRes, kiloRes] = await Promise.all([
        apiFetch<{ data: OleloNoeau }>("/api/olelo-noeau/daily"),
        apiFetch<{ entries: KiloEntry[]; total: number }>("/api/kilo?page=1&limit=5"),
      ]);
      setData({
        olelo: oleloRes.data,
        entries: kiloRes.entries,
        total: kiloRes.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="pb-8"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-6 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              Aloha, {user?.username}!
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="px-3 py-2 rounded-lg bg-gray-100"
          >
            <Text className="text-gray-600 text-sm font-medium">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 pt-6 gap-y-5">
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Daily ʻŌlelo Noʻeau */}
        {data?.olelo && (
          <View className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <Text className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">
              ʻŌlelo Noʻeau
            </Text>
            <Text className="text-blue-900 text-base italic leading-relaxed">
              "{data.olelo.text}"
            </Text>
          </View>
        )}

        {/* New KILO Entry Button */}
        <TouchableOpacity
          className="bg-blue-600 rounded-xl py-4 items-center"
          onPress={() => router.push("/(protected)/kilo")}
        >
          <Text className="text-white font-semibold text-base">+ New KILO Entry</Text>
        </TouchableOpacity>

        {/* KILO History */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-900">Recent KILO Entries</Text>
            {data && data.total > 5 && (
              <Text className="text-sm text-blue-600">{data.total} total</Text>
            )}
          </View>

          {data?.entries.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center border border-gray-100">
              <Text className="text-gray-400 text-sm text-center">
                No entries yet.{"\n"}Tap "+ New KILO Entry" to get started.
              </Text>
            </View>
          ) : (
            data?.entries.map((entry) => (
              <View
                key={entry.id}
                className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs text-gray-400">{formatDate(entry.created_at)}</Text>
                  {entry.has_photo && (
                    <Text className="text-xs text-blue-500">📷 Photo</Text>
                  )}
                </View>
                <Text className="text-gray-800 text-sm font-medium mb-1" numberOfLines={2}>
                  {entry.q1}
                </Text>
                {entry.q2 && (
                  <Text className="text-gray-500 text-sm" numberOfLines={1}>
                    {entry.q2}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
