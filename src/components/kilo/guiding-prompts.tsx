import { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GuidingPromptsColors {
  bg: string;
  border: string;
  text: string;
  dot: string;
  accent: string;
  icon: string;
}

interface GuidingPromptsProps {
  prompts?: string[];
  colors?: GuidingPromptsColors;
}

const DEFAULT_COLORS: GuidingPromptsColors = {
  bg: "#F0F7F1",
  border: "#D1E7D5",
  text: "#3D6B47",
  dot: "#6EBE80",
  accent: "#15803D",
  icon: "leaf-outline",
};

function PromptItems({
  prompts,
  dotColor,
  textColor,
}: {
  prompts: string[];
  dotColor: string;
  textColor: string;
}) {
  return (
    <>
      {prompts.map((prompt, index) => (
        <View key={index} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: dotColor,
              marginTop: 7,
              flexShrink: 0,
            }}
          />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: textColor, fontStyle: "italic" }}>
            {prompt}
          </Text>
        </View>
      ))}
    </>
  );
}

export function GuidingPrompts({ prompts, colors }: GuidingPromptsProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const animValue = useRef(new Animated.Value(0)).current;
  const expandedRef = useRef(false);
  const [, forceRender] = useState(0);
  const c = colors ?? DEFAULT_COLORS;

  const toggle = useCallback(() => {
    const next = !expandedRef.current;
    expandedRef.current = next;
    forceRender((n) => n + 1);
    Animated.timing(animValue, {
      toValue: next ? 1 : 0,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [animValue]);

  const chevronRotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const opacityInterp = animValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  const translateInterp = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  if (!prompts || prompts.length === 0) return null;

  // Height interpolation needs contentHeight in the output range.
  // When contentHeight is 0 (not yet measured), we use a large fallback
  // so the first open still works; it snaps to correct once measured.
  const heightInterp = contentHeight > 0
    ? animValue.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] })
    : animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });

  return (
    <View
      style={{
        marginTop: 14,
        marginBottom: 10,
        borderRadius: 16,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        overflow: "hidden",
      }}
    >
      {/* Hidden view to measure content height before first expand */}
      {contentHeight === 0 && (
        <View
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) setContentHeight(h);
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 10 }}>
            <PromptItems prompts={prompts} dotColor={c.dot} textColor={c.text} />
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 13,
          gap: 10,
        }}
      >
        <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={17} color={c.accent} />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: c.accent,
            letterSpacing: 0.3,
          }}
        >
          What to look for
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={16} color={c.accent} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={{ height: heightInterp, overflow: "hidden" }}>
        <Animated.View
          style={{
            opacity: opacityInterp,
            transform: [{ translateY: translateInterp }],
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingTop: 4,
            gap: 10,
          }}
        >
          <PromptItems prompts={prompts} dotColor={c.dot} textColor={c.text} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
