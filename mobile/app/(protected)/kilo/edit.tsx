import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { FadeIn } from "@/components/shared/fade-in";

const QUESTIONS = [
  { id: "q1", label: "Lani (Air) — What do you observe in the sky and air around you today?", required: true },
  { id: "q2", label: "Honua (Earth & Ocean) — What do you notice about the land and water today?", required: false },
  { id: "q3", label: "Hānaumoku (All Life Forces) — What living things do you observe today?", required: false },
];

export default function EditKiloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "" });
  const [isLoading, setIsLoading]     = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ entry: { q1: string; q2: string | null; q3: string | null } }>(
      `/api/kilo?id=${id}`
    )
      .then(({ entry }) =>
        setAnswers({ q1: entry.q1, q2: entry.q2 ?? "", q3: entry.q3 ?? "" })
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
      <View className="px-6 pt-14 pb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">Edit Entry</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color="#78716C" />
        </TouchableOpacity>
      </View>

      <View className="h-px bg-gray-100 mx-6" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
            <Text className="text-red-700 text-base">{error}</Text>
          </View>
        )}

        {QUESTIONS.map((q, i) => (
          <FadeIn key={q.id} delay={i * 80}>
            <View style={{ marginBottom: 20 }}>
              <Text className="text-sm font-bold uppercase tracking-wide mb-1.5" style={{ color: "#15803D", opacity: 0.7 }}>
                {q.label}
                {q.required && <Text style={{ color: "#B91C1C" }}> *</Text>}
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#FAFAF9", borderWidth: 1, borderColor: "#E7E5E4",
                  borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
                  fontSize: 16, color: "#1C1917", minHeight: 96, textAlignVertical: "top",
                }}
                placeholder="Your answer..."
                placeholderTextColor="#9CA3AF"
                value={answers[q.id as keyof typeof answers]}
                onChangeText={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
                multiline
                editable={!isSubmitting}
              />
            </View>
          </FadeIn>
        ))}
      </ScrollView>

      {/* Bottom nav */}
      <View
        className="border-t border-gray-100 bg-white"
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 16,
            paddingHorizontal: 20, paddingVertical: 14,
          }}
        >
          <Ionicons name="chevron-back" size={16} color="#78716C" />
          <Text className="text-gray-600 text-base font-semibold">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14,
            backgroundColor: isSubmitting ? "#6EBE80" : "#15803D",
            shadowColor: "#15803D",
            shadowOpacity: 0.2,
            shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white text-base font-bold">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
