import { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { HeroSection } from "@/components/landing/hero-section";
import { OleloNoeau } from "@/components/landing/olelo-noeau";
import { TodaySummary } from "@/components/landing/today-summary";
import { FadeIn } from "@/components/shared/fade-in";
import { KiloCta } from "@/components/landing/kilo-cta";

type TodayKiloResponse = {
  entries: Array<{ id: number }>;
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function LandingScreen() {
  const { user, profile, profileComplete, isLoading, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasEntryToday, setHasEntryToday] = useState(false);

  const load = useCallback(async () => {
    await refreshProfile();

    const today = formatLocalDate(new Date());
    const tzOffset = new Date().getTimezoneOffset();
    const data = await apiFetch<TodayKiloResponse>(
      `/api/kilo?page=1&limit=1&date=${today}&tz=${tzOffset}`
    );
    setHasEntryToday(data.entries.length > 0);
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setHasEntryToday(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  const displayName = profile?.first_name || user?.username || "friend";

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="pb-28 pt-10"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#15803D"
        />
      }
    >
      <FadeIn>
        <HeroSection userName={displayName} />
      </FadeIn>

      {!profileComplete && (
        <FadeIn delay={50}>
          <View className="px-7 py-2">
            <View
              className="rounded-[28px] border px-5 py-6"
              style={{ borderColor: "#D8B46A55", backgroundColor: "#FFFBEB" }}
            >
              <Text
                className="text-3xl text-stone-900"
                style={{ fontFamily: "Newsreader_400Regular" }}
              >
                Finish onboarding before your first KILO.
              </Text>
              <Text className="mt-3 text-sm leading-6 text-stone-600">
                Add your name, date of birth, and ahupuaʻa. You can fill in the rest later.
              </Text>
              <TouchableOpacity
                className="mt-5 self-start rounded-full px-5 py-3"
                style={{ backgroundColor: "#15803D" }}
                onPress={() => router.push("/(protected)/onboarding")}
                activeOpacity={0.8}
              >
                <Text className="text-sm font-bold text-white">Continue onboarding</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>
      )}

      <FadeIn delay={100}>
        <OleloNoeau />
      </FadeIn>

      <FadeIn delay={200}>
        <TodaySummary />
      </FadeIn>

      <FadeIn delay={300}>
        <KiloCta profileComplete={profileComplete} hasEntryToday={hasEntryToday} />
      </FadeIn>
    </ScrollView>
  );
}
