import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { FadeIn } from "@/components/shared/fade-in";
import { GuidingPrompts } from "@/components/kilo/guiding-prompts";
import { getTheme } from "@/components/kilo/question-theme";
import { QUESTIONS } from "@kilo/shared/types";

export default function EditKiloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [isLoading, setIsLoading]     = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ entry: { q1: string; q2: string | null; q3: string | null; q4: string | null } }>(
      `/api/kilo?id=${id}`
    )
      .then(({ entry }) =>
        setAnswers({
          q1: entry.q1,
          q2: entry.q2 ?? "",
          q3: entry.q3 ?? "",
          q4: entry.q4 ?? "",
        })
      )
      .catch(() => setError("Failed to load entry."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!answers.q1.trim()) {
      setError("Question 1 is required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/api/kilo", {
        method: "PUT",
        body: JSON.stringify({
          id: Number(id),
          q1: answers.q1,
          q2: answers.q2 || null,
          q3: answers.q3 || null,
          q4: answers.q4 || null,
        }),
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={{
        paddingHorizontal: 28,
        paddingTop: 58,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1C1917", letterSpacing: 0.3 }}>
          Edit Entry
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#F5F5F4",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={20} color="#78716C" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, position: "relative" }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={{
            backgroundColor: "#FEF2F2",
            borderWidth: 1,
            borderColor: "#FECACA",
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
          }}>
            <Text style={{ color: "#B91C1C", fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {QUESTIONS.map((q, i) => {
          const theme = getTheme(q.id);
          const guideColors = {
            bg: theme.guideBg,
            border: theme.guideBorder,
            text: theme.guideText,
            dot: theme.guideDot,
            accent: theme.accent,
            icon: theme.icon,
          };

          return (
            <FadeIn key={q.id} delay={i * 100}>
              <View style={{
                marginBottom: 16,
                borderRadius: 20,
                backgroundColor: theme.gradientStart,
                padding: 18,
                borderWidth: 1,
                borderColor: theme.guideBorder,
              }}>
                {/* Question header with icon */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Ionicons
                    name={theme.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={theme.accent}
                  />
                  <Text style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: "700",
                    color: theme.accentDark,
                    letterSpacing: 0.3,
                    fontFamily: "Newsreader_400Regular",
                  }}>
                    {q.question}
                  </Text>
                  {q.required && (
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#B91C1C" }}>Required</Text>
                  )}
                </View>

                {/* Guiding prompts */}
                <GuidingPrompts prompts={q.guides} colors={guideColors} />

                {/* Input */}
                <TextInput
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderWidth: 1.5,
                    borderColor: theme.inputBorder,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: "#1C1917",
                    minHeight: 88,
                    textAlignVertical: "top",
                    marginTop: 8,
                    lineHeight: 22,
                  }}
                  placeholder="Your observation..."
                  placeholderTextColor="#9CA3AF"
                  value={answers[q.id as keyof typeof answers]}
                  onChangeText={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
                  multiline
                  editable={!isSubmitting}
                />
              </View>
            </FadeIn>
          );
        })}
      </ScrollView>

        {/* ── Top fade ── */}
        <LinearGradient
          colors={["#FFFFFF", "#FFFFFF00"]}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 24,
          }}
        />

        {/* ── Bottom fade ── */}
        <LinearGradient
          colors={["#FFFFFF00", "#FFFFFF"]}
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 36,
          }}
        />
      </View>

      {/* Bottom nav */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: Platform.OS === "ios" ? 32 : 16,
        backgroundColor: "white",
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderWidth: 1.5,
            borderColor: "#E7E5E4",
            borderRadius: 20,
            paddingHorizontal: 22,
            paddingVertical: 14,
          }}
        >
          <Ionicons name="chevron-back" size={16} color="#78716C" />
          <Text style={{ color: "#78716C", fontSize: 15, fontWeight: "600" }}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 20,
            paddingHorizontal: 28,
            paddingVertical: 14,
            backgroundColor: isSubmitting ? "#6EBE80" : "#15803D",
            shadowColor: "#15803D",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
