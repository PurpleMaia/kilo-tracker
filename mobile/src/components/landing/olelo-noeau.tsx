import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";

interface OleloResponse {
  data: { id: number; text: string } | null;
  date: string;
}

export function OleloNoeau() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      apiFetch<OleloResponse>("/api/olelo-noeau/daily")
        .then((res) => setText(res.data?.text || null))
        .catch(() => {
          console.error("Failed to fetch daily ʻOlelo Noʻeau");
        })
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View className="px-7 py-6 items-center">
        <View className="h-4 w-3/4 rounded bg-koa-stone/10" />
        <View className="h-3 w-1/2 rounded bg-koa-stone/10 mt-2" />
      </View>
    );
  }

  if (!text) return null;

  return (
    <View className="px-7 py-4 items-center">
      <Text
        className="text-base text-koa-sand text-center italic leading-6"
        style={{ fontFamily: "Newsreader_400Regular_Italic" }}
      >
        &ldquo;{text}&rdquo;
      </Text>
      <View className="h-px bg-koa-stone/20 mt-6 w-full" />
    </View>
  );
}
