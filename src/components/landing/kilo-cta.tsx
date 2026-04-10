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
          borderColor: profileComplete ? "#15803D" : "#E7E5E4",
        }}
        onPress={() =>
          router.push(profileComplete ? "/(protected)/kilo" : "/(protected)/onboarding")
        }
        activeOpacity={0.7}
      >
        <Text
          className="text-xl font-semibold text-green-700"
          style={{
            fontFamily: "Newsreader_400Regular",            
          }}
        >
          {label}
        </Text>
        {!hasEntryToday && (
          <Text className="text-sm text-green-700 mt-1">
            {profileComplete ? (
              <Text style={{ color: "rgba(255,255,255,0.82)" }}>observe · reflect</Text>
            ) : (
              "observe · reflect"
            )}
          </Text>
        )}
      </TouchableOpacity>

      {!profileComplete && (
        <Text className="text-sm text-gray-500 text-center mt-2">
          Complete onboarding to begin
        </Text>
      )}
    </View>
  );
}
