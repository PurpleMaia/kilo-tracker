import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function NoNetwork() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-10">
      {/* Icon badge — mirrors the app's rounded-2xl icon containers */}
      <View
        className="w-16 h-16 rounded-2xl items-center justify-center mb-5"
        style={{ backgroundColor: "#15803D15" }}
      >
        <Ionicons name="cloud-offline-outline" size={30} color="#15803D" />
      </View>

      {/* Title — uses Newsreader to match page headers */}
      <Text
        className="text-2xl text-gray-900 font-bold text-center mb-2"
        style={{ fontFamily: "Newsreader_400Regular" }}
      >
        No Connection
      </Text>

      {/* Divider — matches the section dividers used throughout */}
      <View className="flex-row items-center my-3 w-full">
        <View className="h-px flex-1 bg-gray-100" />
        <View
          className="w-2 h-2 rounded-full mx-3"
          style={{ backgroundColor: "#15803D", opacity: 0.3 }}
        />
        <View className="h-px flex-1 bg-gray-100" />
      </View>

      {/* Subtitle */}
      <Text
        className="text-base text-gray-500 text-center leading-6"
      >
        Check your Wi-Fi or cellular connection.
      </Text>
    </View>
  );
}
