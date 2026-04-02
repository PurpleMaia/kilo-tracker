import { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

export function GuidingPrompts({ prompts, colors }: GuidingPromptsProps) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const c = colors ?? DEFAULT_COLORS;

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
    );
    setExpanded((prev) => {
      Animated.spring(rotateAnim, {
        toValue: prev ? 0 : 1,
        tension: 120,
        friction: 14,
        useNativeDriver: true,
      }).start();
      return !prev;
    });
  }, [rotateAnim]);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  if (!prompts || prompts.length === 0) return null;

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

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 10 }}>
          {prompts.map((prompt, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: c.dot,
                  marginTop: 7,
                  flexShrink: 0,
                }}
              />
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.text, fontStyle: "italic" }}>
                {prompt}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
