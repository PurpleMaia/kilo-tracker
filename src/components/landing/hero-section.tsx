import { View, Text } from "react-native";
import { getAloha } from "@/lib/aloha";
import { getMahina, getKau } from "@/lib/hawaiian-calendar";
import { MoonPhaseCard } from "../MoonPhaseCard";

interface HeroSectionProps {
  userName: string;
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function HeroSection({ userName }: HeroSectionProps) {
  const greeting = getAloha(userName);
  const today = formatToday();
  const mahina = getMahina();
  const kau = getKau();

  return (
    <View className="px-7 pt-16 pb-4">
      <Text
        className="text-4xl font-bold text-gray-900 leading-tight"
        style={{ fontFamily: "Newsreader_400Regular" }}
      >
        {greeting}
      </Text>

      <Text className="text-lg text-gray-500 mt-2">{today}</Text>

      <MoonPhaseCard />

      <View className="h-px bg-gray-100 mt-6" />
    </View>
  );
}
