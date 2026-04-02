import { useState, useCallback } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";
import Svg, { Circle, Path } from "react-native-svg";

type MoonPhaseResult = {
  name: string;
  illumination: number;
  description: string;
  anahulu: string;
  waning: boolean;
  date: string;
};

function MoonIcon({ illumination, anahulu }: { illumination: number; anahulu: string }) {
  const size = 56;
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  const isWaxing = anahulu === "Hoʻonui";
  const fraction = illumination / 100;

  const innerX = cx + r * (1 - 2 * fraction) * (isWaxing ? 1 : -1);

  const sweepOuter = isWaxing ? 1 : 0;
  const sweepInner = fraction > 0.5 ? sweepOuter : 1 - sweepOuter;

  const path = [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r}`,
    `A ${Math.abs(innerX - cx)} ${r} 0 0 ${sweepInner} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={r} fill="#1e293b" stroke="#475569" strokeWidth={1} />
      {illumination > 0.5 && illumination < 99.5 && (
        <Path d={path} fill="#fef3c7" />
      )}
      {illumination >= 99.5 && (
        <Circle cx={cx} cy={cy} r={r} fill="#fef3c7" />
      )}
    </Svg>
  );
}

export function MoonPhaseCard() {
  const [phase, setPhase] = useState<MoonPhaseResult | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      apiFetch<{ data: MoonPhaseResult }>("/api/moon")
        .then((res) => setPhase(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View className="bg-white rounded-2xl p-5 border border-gray-100 items-center justify-center py-8">
        <ActivityIndicator size="small" color="#9ca3af" />
      </View>
    );
  }

  if (!phase) return null;

  return (
    <View className="bg-white rounded-2xl p-5 border border-gray-100">
      <Text className="text-base font-bold text-gray-900 mb-3">Mahina — Moon Phase</Text>
      <View className="flex-row items-center gap-x-4">
        <MoonIcon illumination={phase.illumination} anahulu={phase.anahulu} />
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">{phase.name}</Text>
          <Text className="text-sm text-gray-500">{phase.description}</Text>
          <Text className="text-xs text-gray-400 mt-1">
            {phase.anahulu} · {Math.round(phase.illumination)}% illuminated · {phase.waning ? "Waning" : "Waxing"}
          </Text>
        </View>
      </View>
    </View>
  );
}
