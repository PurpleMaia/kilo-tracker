import { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { HeroSection } from "@/components/landing/hero-section";
import { OleloNoeau } from "@/components/landing/olelo-noeau";
import { TodaySummary } from "@/components/landing/today-summary";
import { FadeIn } from "@/components/shared/fade-in";

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

export default function LandingScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ profile: UserProfile | null }>(
        "/api/profile"
      );
      setProfile(res.profile);
    } catch {
      // graceful empty state
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

      <FadeIn delay={100}>
        <OleloNoeau />
      </FadeIn>

      <FadeIn delay={200}>
        <TodaySummary />
      </FadeIn>
    </ScrollView>
  );
}
