import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";

const QUESTIONS = [
  { id: "q1", label: "What is your internal weather today?", required: true },
  { id: "q2", label: "What do you see outside today?",       required: false },
  { id: "q3", label: "What are you excited to do today?",   required: false },
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
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">Edit Entry</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-sm text-gray-500 font-medium">Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {QUESTIONS.map((q) => (
          <View key={q.id} style={{ marginBottom: 20 }}>
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              {q.label}
              {q.required && <Text className="text-red-500"> *</Text>}
            </Text>
            <TextInput
              style={{
                backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 15, color: "#111827", minHeight: 96, textAlignVertical: "top",
              }}
              placeholder="Your answer..."
              placeholderTextColor="#9ca3af"
              value={answers[q.id as keyof typeof answers]}
              onChangeText={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
              multiline
              editable={!isSubmitting}
            />
          </View>
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
            borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
            paddingHorizontal: 20, paddingVertical: 12,
          }}
        >
          <Ionicons name="chevron-back" size={16} color="#4b5563" />
          <Text className="text-gray-600 text-sm font-medium">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
            backgroundColor: isSubmitting ? "#9ca3af" : "#111827",
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white text-sm font-semibold">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
