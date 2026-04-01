import { View, Text } from "react-native";
import { getAloha } from "@/lib/aloha";
import { getMahina, getKau } from "@/lib/hawaiian-calendar";

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
        className="text-3xl text-koa-sand leading-10"
        style={{ fontFamily: "Newsreader_400Regular" }}
      >
        {greeting}
      </Text>

      <Text className="text-base text-koa-stone mt-2">{today}</Text>

      <Text className="text-sm text-koa-stone mt-1">
        ☽ {mahina.name} · Day {mahina.day} · {kau}
      </Text>

      <View className="h-px bg-koa-stone/20 mt-6" />
    </View>
  );
}
