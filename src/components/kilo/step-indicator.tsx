import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { getTheme, type QuestionTheme } from "./question-theme";

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  questionId: string;
}

export function StepIndicator({ totalSteps, currentStep, questionId }: StepIndicatorProps) {
  const theme = getTheme(questionId);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 28 }}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;

        return (
          <View
            key={i}
            style={{
              flex: isActive ? 2.5 : 1,
              height: isActive ? 6 : 4,
              borderRadius: 3,
              backgroundColor: isActive
                ? theme.progressActive
                : isDone
                  ? theme.progressDone
                  : "rgba(255, 255, 255, 0.5)",
            }}
          />
        );
      })}
    </View>
  );
}
