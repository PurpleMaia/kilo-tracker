import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { getTheme } from "./question-theme";

interface ThemedBackgroundProps {
  questionId: string;
  children: React.ReactNode;
}

/**
 * Crossfades between per-question gradient colors using reanimated.
 * Uses two layered absolute-fill views to create a smooth colour transition.
 */
export function ThemedBackground({ questionId, children }: ThemedBackgroundProps) {
  const theme = getTheme(questionId);
  const progress = useSharedValue(0);

  // We store the previous and next colors in shared values via indices
  // But since interpolateColor needs static arrays, we use a simpler approach:
  // animate opacity of a new overlay on top of the old one.
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    overlayOpacity.value = 0;
    overlayOpacity.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.quad),
    });
  }, [questionId]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base layer — holds the current theme color (will show old briefly during transition) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.gradientEnd },
        ]}
      />
      {/* Animated overlay — fades in with new theme */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          overlayStyle,
          { backgroundColor: theme.gradientStart },
        ]}
      />
      {/* Top decorative element — subtle gradient arc */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: -80,
            left: -40,
            right: -40,
            height: 260,
            borderBottomLeftRadius: 200,
            borderBottomRightRadius: 200,
            backgroundColor: theme.gradientEnd,
            opacity: 0.5,
          },
          overlayStyle,
        ]}
      />
      {children}
    </View>
  );
}
