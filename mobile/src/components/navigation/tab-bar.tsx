import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

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
    name: "chat",
    label: "Chat",
    icon: "chatbubble-outline",
    iconActive: "chatbubble",
  },
  {
    name: "profile",
    label: "Profile",
    icon: "person-outline",
    iconActive: "person",
  },
] as const;

export function TabBar({ state }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index]?.name;

  return (
    <View
      className="bg-koa-surface border-t border-koa-stone/10"
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
                onPress={() => router.push("/(protected)/kilo")}
                activeOpacity={0.8}
                className="items-center -mt-5"
              >
                <View className="w-14 h-14 rounded-full bg-koa-fern items-center justify-center shadow-lg">
                  <Ionicons name="add" size={28} color="#F2E8D5" />
                </View>
                <Text
                  className="text-koa-stone mt-1"
                  style={{ fontSize: 10 }}
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
                color={isActive ? "#F2E8D5" : "#B0A48E"}
              />
              <Text
                className={`mt-0.5 ${isActive ? "text-koa-sand" : "text-koa-stone"}`}
                style={{ fontSize: 10 }}
              >
                {tab.label}
              </Text>
              {isActive && (
                <View className="w-1 h-1 rounded-full bg-koa-fern mt-0.5" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
