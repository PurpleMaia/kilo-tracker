import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type UserProfile = {
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  mauna: string | null;
  aina: string | null;
  wai: string | null;
  kula: string | null;
  role: string | null;
};

type KiloEntry = {
  id: number;
  q1: string;
  q2: string | null;
  created_at: string;
  has_photo: boolean;
};

type DashboardData = {
  profile: UserProfile | null;
  entries: KiloEntry[];
  total: number;
};

function isProfileComplete(p: UserProfile | null): boolean {
  if (!p) return false;
  return !!(p.first_name?.trim() && p.last_name?.trim() && p.dob &&
    p.mauna?.trim() && p.aina?.trim() && p.wai?.trim() && p.kula?.trim() && p.role?.trim());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProfileRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-gray-100">
      <Text className="text-gray-500 text-sm">{label}:</Text>
      <Text className={`text-sm ${value ? "text-gray-900 font-medium" : "text-gray-400 italic"}`}>
        {value ?? "Not set"}
      </Text>
    </View>
  );
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
      const [profileRes, kiloRes] = await Promise.all([
        apiFetch<{ profile: UserProfile | null }>("/api/profile"),
        apiFetch<{ entries: KiloEntry[]; total: number }>("/api/kilo?page=1&limit=5"),
      ]);
      setData({ profile: profileRes.profile, entries: kiloRes.entries, total: kiloRes.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
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
  );

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

  const profile = data?.profile ?? null;
  const profileDone = isProfileComplete(profile);
  const fullName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}` : null;
  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-5 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900 tracking-wide">KILO</Text>
          <TouchableOpacity
            onPress={() => router.push("/(protected)/profile")}
            className="w-9 h-9 rounded-full bg-gray-800 items-center justify-center"
          >
            <Text className="text-white text-sm font-bold">{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 pt-5 gap-y-4">
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Welcome + New KILO button */}
        <View className="flex-row items-start justify-between">
          <Text className="text-2xl font-bold text-gray-900">Welcome, {user?.username}!</Text>
          <View className="items-end">
            <TouchableOpacity
              className={`px-4 py-2 rounded-xl ${profileDone ? "bg-gray-900" : "bg-gray-200"}`}
              onPress={() => profileDone && router.push("/(protected)/kilo")}
              disabled={!profileDone}
            >
              <Text className={`text-sm font-semibold ${profileDone ? "text-white" : "text-gray-400"}`}>
                Start a new KILO
              </Text>
            </TouchableOpacity>
            {!profileDone && (
              <Text className="text-xs text-gray-400 mt-1">Complete your profile to unlock.</Text>
            )}
          </View>
        </View>

        {/* Your Account Card */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-base font-bold text-gray-900">Your Account</Text>
              <Text className="text-xs text-gray-400">View or edit account</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(protected)/profile")}
              className="px-3 py-2 border border-gray-200 rounded-xl"
            >
              <Text className="text-sm text-gray-700 font-medium">Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Account Info
          </Text>
          <ProfileRow label="Username" value={user?.username ?? null} />
          <ProfileRow label="Email" value={user?.email ?? null} />

          <View className="flex-row items-center justify-between mt-4 mb-2">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Profile</Text>
            {!profileDone && (
              <View className="px-2 py-0.5 border border-yellow-400 rounded-full">
                <Text className="text-xs text-yellow-600 font-medium">Incomplete</Text>
              </View>
            )}
          </View>
          <ProfileRow label="Name" value={fullName} />
          <ProfileRow label="Date of Birth" value={profile?.dob ? new Date(profile.dob).toLocaleDateString() : null} />
          <ProfileRow label="Mauna" value={profile?.mauna ?? null} />
          <ProfileRow label="ʻĀina" value={profile?.aina ?? null} />
          <ProfileRow label="Wai" value={profile?.wai ?? null} />
          <ProfileRow label="School" value={profile?.kula ?? null} />
          <ProfileRow label="Role" value={profile?.role ?? null} />
        </View>

        {/* KILO Entries */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">Your KILO Entries</Text>
            {data && data.total > 5 && (
              <Text className="text-sm text-blue-600">{data.total} total</Text>
            )}
          </View>

          {data?.entries.length === 0 ? (
            <Text className="text-gray-400 text-sm text-center py-4">No entries yet.</Text>
          ) : (
            data?.entries.map((entry) => (
              <View key={entry.id} className="py-3 border-b border-gray-100">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-400">{formatDate(entry.created_at)}</Text>
                  {entry.has_photo && <Text className="text-xs text-blue-500">📷</Text>}
                </View>
                <Text className="text-gray-800 text-sm" numberOfLines={2}>{entry.q1}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
