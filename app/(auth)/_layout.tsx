import { Stack } from "expo-router";
import { useNetwork } from "@/contexts/NetworkContext";
import { NoNetwork } from "@/components/shared/no-network";

export default function AuthLayout() {
  const { isConnected } = useNetwork();

  if (!isConnected) {
    return <NoNetwork />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
