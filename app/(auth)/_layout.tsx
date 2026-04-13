import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { View, ActivityIndicator } from "react-native";
import { NoNetwork } from "@/components/shared/no-network";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isConnected } = useNetwork();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  if (!isConnected) {
    return <NoNetwork />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
