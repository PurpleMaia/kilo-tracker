import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { KiloPhoto } from "@/components/shared/kilo-photo";

type KiloEntry = {
  id: number;
  q1: string;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  created_at: string;
  q1_photo_path: string | null;
  q2_photo_path: string | null;
  q3_photo_path: string | null;
};

type Props = {
  entry: KiloEntry;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  showTime?: boolean;
};

const TIMING_CONFIG = {
  duration: 280,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function CollapsibleKiloCard({ entry, onEdit, onDelete, showTime }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const animHeight = useSharedValue(0);
  const chevronRotation = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);

    if (next) {
      animHeight.value = withTiming(contentHeight, TIMING_CONFIG);
      chevronRotation.value = withTiming(180, TIMING_CONFIG);
      contentOpacity.value = withTiming(1, { duration: 200 });
    } else {
      contentOpacity.value = withTiming(0, { duration: 120 });
      animHeight.value = withTiming(0, TIMING_CONFIG);
      chevronRotation.value = withTiming(0, TIMING_CONFIG);
    }
  }, [expanded, contentHeight, animHeight, chevronRotation, contentOpacity]);

  const expandStyle = useAnimatedStyle(() => ({
    height: animHeight.value,
    overflow: "hidden" as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const onMeasure = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== contentHeight) {
        setContentHeight(h);
        if (expanded) {
          animHeight.value = h;
        }
      }
    },
    [contentHeight, expanded, animHeight]
  );

  return (
    <View
      className="mx-7 mb-3 rounded-2xl bg-gray-50"
      style={{ borderWidth: 1, borderColor: "#E7E5E4" }}
    >
      {/* Collapsed header — always visible */}
      <TouchableOpacity
        className="flex-row items-center px-5 py-4"
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text className="text-sm font-semibold text-gray-500" style={{ minWidth: 100 }}>
          {showTime ? formatTime(entry.created_at) : formatDate(entry.created_at)}
        </Text>
        <Text
          className="flex-1 text-sm text-gray-400 mx-3"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {entry.q1}
        </Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Animated.View>
      </TouchableOpacity>

      {/* Animated expandable area */}
      <Animated.View style={expandStyle}>
        <Animated.View style={contentFadeStyle}>
          <View className="px-5 pb-5">
            {/* Action buttons */}
            <View className="flex-row items-center justify-end mb-3 gap-x-3">
              <TouchableOpacity
                onPress={() => onEdit(entry.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil-outline" size={16} color="#15803D" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(entry.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color="#B91C1C" />
              </TouchableOpacity>
            </View>

            {/* Q1 - Papahulilani */}
            <View className="mb-3">
              <Text
                className="text-sm font-bold uppercase tracking-wide mb-1"
                style={{ color: "#15803D", opacity: 0.7 }}
              >
                Papahulilani
              </Text>
              <Text className="text-base text-gray-700 leading-6">
                {entry.q1}
              </Text>
              {entry.q1_photo_path && <KiloPhoto entryId={entry.id} question="q1" />}
            </View>

            {/* Q2 - Papahulihonua */}
            {entry.q2 && (
              <View className="mb-3 pt-3 border-t border-gray-100">
                <Text
                  className="text-sm font-bold uppercase tracking-wide mb-1"
                  style={{ color: "#15803D", opacity: 0.7 }}
                >
                  Papahulihonua
                </Text>
                <Text className="text-base text-gray-700 leading-6">
                  {entry.q2}
                </Text>
                {entry.q2_photo_path && <KiloPhoto entryId={entry.id} question="q2" />}
              </View>
            )}

            {/* Q3 - Papahānaumoku */}
            {entry.q3 && (
              <View className="mb-3 pt-3 border-t border-gray-100">
                <Text
                  className="text-sm font-bold uppercase tracking-wide mb-1"
                  style={{ color: "#15803D", opacity: 0.7 }}
                >
                  Papahānaumoku
                </Text>
                <Text className="text-base text-gray-700 leading-6">
                  {entry.q3}
                </Text>
                {entry.q3_photo_path && <KiloPhoto entryId={entry.id} question="q3" />}
              </View>
            )}

            {/* Q4 - Naʻau */}
            {entry.q4 && (
              <View className="pt-3 border-t border-gray-100">
                <Text
                  className="text-sm font-bold uppercase tracking-wide mb-1"
                  style={{ color: "#15803D", opacity: 0.7 }}
                >
                  Naʻau
                </Text>
                <Text className="text-base text-gray-700 leading-6">
                  {entry.q4}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      {/* Hidden measuring view */}
      <View
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", left: 0, right: 0 }}
        onLayout={onMeasure}
      >
        <View className="px-5 pb-5">
          <View className="flex-row items-center justify-end mb-3 gap-x-3">
            <View style={{ width: 16, height: 16 }} />
            <View style={{ width: 16, height: 16 }} />
          </View>
          <View className="mb-3">
            <Text className="text-sm font-bold uppercase tracking-wide mb-1">
              Papahulilani
            </Text>
            <Text className="text-base leading-6">{entry.q1}</Text>
            {entry.q1_photo_path && <View style={{ height: 168 }} />}
          </View>
          {entry.q2 && (
            <View className="mb-3 pt-3">
              <Text className="text-sm font-bold uppercase tracking-wide mb-1">
                Papahulihonua
              </Text>
              <Text className="text-base leading-6">{entry.q2}</Text>
              {entry.q2_photo_path && <View style={{ height: 168 }} />}
            </View>
          )}
          {entry.q3 && (
            <View className="mb-3 pt-3">
              <Text className="text-sm font-bold uppercase tracking-wide mb-1">
                Papahānaumoku
              </Text>
              <Text className="text-base leading-6">{entry.q3}</Text>
              {entry.q3_photo_path && <View style={{ height: 168 }} />}
            </View>
          )}
          {entry.q4 && (
            <View className="pt-3">
              <Text className="text-sm font-bold uppercase tracking-wide mb-1">
                Naʻau
              </Text>
              <Text className="text-base leading-6">{entry.q4}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
