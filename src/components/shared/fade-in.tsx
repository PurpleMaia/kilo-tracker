import { useRef, useCallback } from "react";
import { Animated, ViewProps } from "react-native";
import { useFocusEffect } from "expo-router";

interface FadeInProps extends ViewProps {
  delay?: number;
  duration?: number;
  translateY?: number;
  children: React.ReactNode;
}

export function FadeIn({
  delay = 0,
  duration = 400,
  translateY = 12,
  children,
  style,
  ...rest
}: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(translateY)).current;

  useFocusEffect(
    useCallback(() => {
      // Reset to hidden
      opacity.setValue(0);
      translate.setValue(translateY);

      // Animate in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, [opacity, translate, delay, duration, translateY])
  );

  return (
    <Animated.View
      style={[{ opacity, transform: [{ translateY: translate }] }, style]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
