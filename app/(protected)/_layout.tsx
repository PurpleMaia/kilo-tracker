import { Tabs, Redirect, useSegments } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { View, ActivityIndicator } from "react-native";
import { TabBar } from "@/components/navigation/tab-bar";
import { NoNetwork } from "@/components/shared/no-network";

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, profileComplete } = useAuth();
  const { isConnected } = useNetwork();
  const segments = useSegments();
  const onOnboardingRoute = segments.includes("onboarding");
  const onProfileRoute = segments.includes("profile");
  const onLearnRoute = segments.includes("learn");

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profileComplete && !onOnboardingRoute && !onProfileRoute) {
    return <Redirect href="/(protected)/onboarding" />;
  }

  if (profileComplete && onOnboardingRoute) {
    return <Redirect href="/(protected)" />;
  }

  if (!isConnected && !onLearnRoute) {
    return <NoNetwork />;
  }

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen
        name="onboarding"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="kilo"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}
