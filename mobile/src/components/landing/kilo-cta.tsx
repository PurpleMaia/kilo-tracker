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
        className={`border rounded-2xl py-5 px-6 items-center ${
          profileComplete
            ? "border-koa-fern/40 bg-koa-surface"
            : "border-koa-stone/20 bg-koa-surface/50"
        }`}
        onPress={() => profileComplete && router.push("/(protected)/kilo")}
        disabled={!profileComplete}
        activeOpacity={0.7}
      >
        <Text
          className={`text-lg ${
            profileComplete ? "text-koa-fern" : "text-koa-stone"
          }`}
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          {label}
        </Text>
        {!hasEntryToday && (
          <Text className="text-xs text-koa-stone mt-1">
            observe · reflect
          </Text>
        )}
      </TouchableOpacity>

      {!profileComplete && (
        <Text className="text-xs text-koa-stone text-center mt-2">
          Complete your profile to begin
        </Text>
      )}
    </View>
  );
}
