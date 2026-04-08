import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { name: "index", label: "Home", icon: "home-outline", iconActive: "home" },
  {
    name: "history",
    label: "History",
    icon: "book-outline",
    iconActive: "book",
  },
  { name: "__kilo__", label: "Kilo", icon: "add", iconActive: "add" },
  {
    name: "learn",
    label: "Learn",
    icon: "leaf-outline",
    iconActive: "leaf",
  },
  {
    name: "profile",
    label: "Profile",
    icon: "person-outline",
    iconActive: "person",
  },
] as const;

export function TabBar({ state }: { state: { index: number; routes: Array<{ name: string }> } }) {
  const activeRoute = state.routes[state.index]?.name;
  const { profileComplete } = useAuth();

  if (activeRoute === "kilo" || activeRoute === "onboarding") {
    return null;
  }

  return (
    <View
      className="bg-white border-t border-gray-100"
      style={{
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
      }}
    >
      <View className="flex-row items-end justify-around px-2 pt-2">
        {TABS.map((tab) => {
          if (tab.name === "__kilo__") {
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() =>
                  router.push(
                    profileComplete ? "/(protected)/kilo" : "/(protected)/onboarding"
                  )
                }
                activeOpacity={0.8}
                className="items-center -mt-5"
              >
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: "#15803D",
                    shadowColor: "#15803D",
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
                <Text
                  className="text-gray-500 mt-1 font-medium"
                  style={{ fontSize: 11 }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          const isActive = activeRoute === tab.name;
          const iconName = isActive ? tab.iconActive : tab.icon;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                const route = tab.name === "index" ? "/" : `/${tab.name}`;
                router.navigate(`/(protected)${route}` as never);
              }}
              activeOpacity={0.7}
              className="items-center py-1 px-3"
            >
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={22}
                color={isActive ? "#15803D" : "#A8A29E"}
              />
              <Text
                className={`mt-0.5 ${isActive ? "font-semibold" : "font-medium"}`}
                style={{
                  fontSize: 11,
                  color: isActive ? "#15803D" : "#A8A29E",
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
