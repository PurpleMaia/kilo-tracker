import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

interface KiloCtaProps {
  profileComplete: boolean;
  hasEntryToday: boolean;
}

export function KiloCta({ profileComplete, hasEntryToday }: KiloCtaProps) {
  const label = hasEntryToday ? "Start another kilo" : "Begin your kilo";

  return (
    <View className="px-7 py-4">
      <TouchableOpacity
        className={`rounded-2xl py-5 px-6 items-center ${
          profileComplete
            ? "bg-gray-50"
            : "bg-gray-50/50"
        }`}
        style={{
          borderWidth: 1,
          borderColor: profileComplete ? "#15803D30" : "#E7E5E4",
        }}
        onPress={() => profileComplete && router.push("/(protected)/kilo")}
        disabled={!profileComplete}
        activeOpacity={0.7}
      >
        <Text
          className="text-xl font-semibold"
          style={{
            fontFamily: "Newsreader_400Regular",
            color: profileComplete ? "#15803D" : "#78716C",
          }}
        >
          {label}
        </Text>
        {!hasEntryToday && (
          <Text className="text-sm text-gray-500 mt-1">
            observe · reflect
          </Text>
        )}
      </TouchableOpacity>

      {!profileComplete && (
        <Text className="text-sm text-gray-500 text-center mt-2">
          Complete your profile to begin
        </Text>
      )}
    </View>
  );
}
