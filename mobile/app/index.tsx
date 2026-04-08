import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading, profileComplete } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Redirect
      href={
        isAuthenticated
          ? profileComplete
            ? "/(protected)"
            : "/(protected)/onboarding"
          : "/(auth)/login"
      }
    />
  );
}
