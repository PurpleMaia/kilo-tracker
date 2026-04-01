import { useState, useEffect } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type ProfileForm = {
  first_name: string;
  last_name: string;
  dob: string;
  mauna: string;
  aina: string;
  wai: string;
  kula: string;
  role: string;
};

const EMPTY: ProfileForm = { first_name: "", last_name: "", dob: "", mauna: "", aina: "", wai: "", kula: "", role: "" };

const FIELDS: { key: keyof ProfileForm; label: string; placeholder: string }[] = [
  { key: "first_name", label: "First Name", placeholder: "e.g. Kealoha" },
  { key: "last_name",  label: "Last Name",  placeholder: "e.g. Akana" },
  { key: "dob",        label: "Date of Birth", placeholder: "YYYY-MM-DD" },
  { key: "mauna",      label: "Mauna",      placeholder: "e.g. Mauna Kea" },
  { key: "aina",       label: "ʻĀina",      placeholder: "e.g. Kailua" },
  { key: "wai",        label: "Wai",        placeholder: "e.g. Nuʻuanu" },
  { key: "kula",       label: "School",     placeholder: "e.g. Punahou" },
  { key: "role",       label: "Role",       placeholder: "e.g. student, teacher" },
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<{ profile: ProfileForm | null }>("/api/profile")
      .then(({ profile }) => {
        if (profile) {
          setForm({
            first_name: profile.first_name ?? "",
            last_name:  profile.last_name  ?? "",
            dob:        profile.dob        ? new Date(profile.dob).toISOString().split("T")[0] : "",
            mauna:      profile.mauna      ?? "",
            aina:       profile.aina       ?? "",
            wai:        profile.wai        ?? "",
            kula:       profile.kula       ?? "",
            role:       profile.role       ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => {
        router.back();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-blue-600 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">Edit Profile</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="px-6 py-5 gap-y-4 pb-10" keyboardShouldPersistTaps="handled">
        {/* Account info (read-only) */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Account</Text>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500 text-sm">Username</Text>
            <Text className="text-gray-900 text-sm font-medium">{user?.username}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500 text-sm">Email</Text>
            <Text className="text-gray-900 text-sm font-medium">{user?.email}</Text>
          </View>
        </View>

        {/* Editable profile fields */}
        <View className="bg-white rounded-2xl p-5 border border-gray-100 gap-y-4">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Profile</Text>

          {FIELDS.map(({ key, label, placeholder }) => (
            <View key={key}>
              <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm bg-gray-50"
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                value={form[key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                autoCapitalize={key === "dob" ? "none" : "words"}
                autoCorrect={false}
                editable={!isSaving}
              />
            </View>
          ))}
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${isSaving || saved ? "bg-blue-400" : "bg-blue-600"}`}
          onPress={handleSave}
          disabled={isSaving || saved}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {saved ? "Saved!" : "Save Profile"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
