import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from "react-native-svg";

type MoonPhaseResult = {
  name: string;
  illumination: number;
  description: string;
  anahulu: string;
  waning: boolean;
  date: string;
};

// ── Moon SVG ────────────────────────────────────────────────────────
// Larger, more detailed moon with a soft glow halo

function MoonIcon({
  illumination,
  anahulu,
  size = 72,
}: {
  illumination: number;
  anahulu: string;
  size?: number;
}) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const isWaxing = anahulu === "Ho\u02BBonui";
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
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="60%" stopColor="#fef3c7" stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Soft ambient glow */}
      <Circle cx={cx} cy={cy} r={r + 3} fill="url(#glow)" />

      {/* Dark side of the moon */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#1e293b"
        stroke="#334155"
        strokeWidth={0.75}
      />

      {/* Illuminated crescent / disc */}
      {illumination > 0.5 && illumination < 99.5 && (
        <Path d={path} fill="#fef3c7" />
      )}
      {illumination >= 99.5 && (
        <Circle cx={cx} cy={cy} r={r} fill="#fef3c7" />
      )}
    </Svg>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────

function MoonSkeleton() {
  return (
    <View className="mt-5 rounded-2xl overflow-hidden">
      {/* Dark header skeleton */}
      <View
        className="items-center py-6"
        style={{ backgroundColor: "#1e293b" }}
      >
        <View
          className="rounded-full mb-3"
          style={{
            width: 72,
            height: 72,
            backgroundColor: "#334155",
          }}
        />
        <View className="h-3 w-20 rounded-full bg-gray-600 mb-2" />
        <View className="h-5 w-32 rounded-full bg-gray-600" />
      </View>

      {/* Light body skeleton */}
      <View className="bg-white p-5 border-x border-b border-gray-100 rounded-b-2xl">
        <View className="h-3 w-3/4 rounded-full bg-gray-100 mb-2" />
        <View className="h-3 w-1/2 rounded-full bg-gray-100" />
      </View>
    </View>
  );
}


// ── Main component ──────────────────────────────────────────────────

export function MoonPhaseCard() {
  const [phase, setPhase] = useState<MoonPhaseResult | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      apiFetch<{ data: MoonPhaseResult }>("/api/moon")
        .then((res) => setPhase(res.data))
        .catch((err) => {
          if (__DEV__) console.error("Failed to fetch moon phase:", err);
        })
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) return <MoonSkeleton />;
  if (!phase) return null;

  return (
    <View className="mt-5 rounded-2xl overflow-hidden">
      {/* ─── Dark celestial header ─── */}
      <View
        className="items-center pt-6 pb-5 px-5"
        style={{ backgroundColor: "#1e293b" }}
      >
        {/* Anahulu label */}
        <Text
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#15803D", opacity: 0.85 }}
        >
          {phase.anahulu}
        </Text>

        {/* Hero moon icon */}
        <MoonIcon
          illumination={phase.illumination}
          anahulu={phase.anahulu}
          size={72}
        />

        {/* Phase name */}
        <Text
          className="text-2xl text-white mt-3"
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          {phase.name}
        </Text>

        {/* Illumination */}
        <Text
          className="text-xs mt-2"
          style={{ color: "#fef3c7", opacity: 0.6 }}
        >
          {Math.round(phase.illumination)}% illuminated
        </Text>
      </View>

      {/* ─── Light body ─── */}
      <View
        className="px-5 py-4"
        style={{
          backgroundColor: "#FAFAF9",
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderColor: "#E7E5E4",
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
        }}
      >
        <Text
          className="text-base text-gray-700 leading-6"
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          {phase.description}
        </Text>

      </View>
    </View>
  );
}
