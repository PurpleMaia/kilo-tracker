import { useCallback } from "react";
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
import { HeroSection } from "@/components/landing/hero-section";
import { OleloNoeau } from "@/components/landing/olelo-noeau";
import { TodaySummary } from "@/components/landing/today-summary";
import { FadeIn } from "@/components/shared/fade-in";
import { KiloCta } from "@/components/landing/kilo-cta";

export default function LandingScreen() {
  const { user, profile, profileComplete, isLoading, refreshProfile } = useAuth();
  const isRefreshing = false;

  const load = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    await load();
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
        <KiloCta profileComplete={profileComplete} hasEntryToday={false} />
      </FadeIn>
    </ScrollView>
  );
}
