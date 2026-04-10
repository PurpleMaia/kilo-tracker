import { apiFetch } from "@/lib/api";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

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
          if (__DEV__) console.error("Failed to fetch daily ʻOlelo Noʻeau");
        })
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View className="px-7 py-6 items-center">
        <View className="h-4 w-3/4 rounded-full bg-gray-100" />
        <View className="h-3 w-1/2 rounded-full bg-gray-100 mt-2" />
      </View>
    );
  }

  if (!text) return null;

  return (
    <View className="mx-7 my-4 rounded-2xl bg-gray-50 p-5" style={{ borderLeftWidth: 3, borderLeftColor: "#15803D" }}>
      <Text className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: "#15803D", opacity: 0.8 }}>
        &#699;ōlelo no&#699;eau
      </Text>
      <Text
        className="text-lg text-gray-700 italic leading-7"
        style={{ fontFamily: "Newsreader_400Regular_Italic" }}
      >
        &ldquo;{text}&rdquo;
      </Text>
    </View>
  );
}
