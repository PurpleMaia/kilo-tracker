import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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

const EMPTY: ProfileForm = {
  first_name: "",
  last_name: "",
  dob: "",
  mauna: "",
  aina: "",
  wai: "",
  kula: "",
  role: "",
};

const FIELDS: {
  key: keyof ProfileForm;
  label: string;
  placeholder: string;
}[] = [
  { key: "first_name", label: "First Name", placeholder: "e.g. Kealoha" },
  { key: "last_name", label: "Last Name", placeholder: "e.g. Akana" },
  { key: "dob", label: "Date of Birth", placeholder: "YYYY-MM-DD" },
  { key: "mauna", label: "Mauna", placeholder: "e.g. Mauna Kea" },
  { key: "aina", label: "ʻĀina", placeholder: "e.g. Kailua" },
  { key: "wai", label: "Wai", placeholder: "e.g. Nuʻuanu" },
  { key: "kula", label: "School", placeholder: "e.g. Punahou" },
  { key: "role", label: "Role", placeholder: "e.g. student, teacher" },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
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
            last_name: profile.last_name ?? "",
            dob: profile.dob
              ? new Date(profile.dob).toISOString().split("T")[0]
              : "",
            mauna: profile.mauna ?? "",
            aina: profile.aina ?? "",
            wai: profile.wai ?? "",
            kula: profile.kula ?? "",
            role: profile.role ?? "",
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
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-koa-bg">
        <ActivityIndicator size="large" color="#B0A48E" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-koa-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="px-7 pt-16 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text
          className="text-2xl text-koa-sand mb-1"
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          Profile
        </Text>
        <Text className="text-sm text-koa-stone mb-6">
          {user?.email}
        </Text>
        <View className="h-px bg-koa-stone/20 mb-6" />

        {/* Account info (read-only) */}
        <View className="bg-koa-surface rounded-2xl p-5 border border-koa-stone/10 mb-4">
          <Text className="text-xs font-semibold text-koa-stone uppercase tracking-wide mb-3">
            Account
          </Text>
          <View className="flex-row justify-between py-2 border-b border-koa-stone/10">
            <Text className="text-koa-stone text-sm">Username</Text>
            <Text className="text-koa-sand text-sm font-medium">
              {user?.username}
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-koa-stone text-sm">Email</Text>
            <Text className="text-koa-sand text-sm font-medium">
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Editable profile fields */}
        <View className="bg-koa-surface rounded-2xl p-5 border border-koa-stone/10 mb-4">
          <Text className="text-xs font-semibold text-koa-stone uppercase tracking-wide mb-4">
            Profile
          </Text>

          {FIELDS.map(({ key, label, placeholder }) => (
            <View key={key} className="mb-4">
              <Text className="text-sm font-medium text-koa-sand mb-1">
                {label}
              </Text>
              <TextInput
                className="border border-koa-stone/20 rounded-xl px-4 py-3 text-koa-sand text-sm bg-koa-bg"
                placeholder={placeholder}
                placeholderTextColor="#B0A48E"
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
          <View className="bg-koa-danger/10 border border-koa-danger/30 rounded-xl p-4 mb-4">
            <Text className="text-koa-danger text-sm">{error}</Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          className={`rounded-xl py-4 items-center mb-4 ${
            isSaving || saved ? "bg-koa-fern/60" : "bg-koa-fern"
          }`}
          onPress={handleSave}
          disabled={isSaving || saved}
        >
          {isSaving ? (
            <ActivityIndicator color="#F2E8D5" />
          ) : (
            <Text className="text-koa-sand font-semibold text-base">
              {saved ? "Saved!" : "Save Profile"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          className="rounded-xl py-4 items-center border border-koa-danger/30 flex-row justify-center gap-x-2"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#D4695A" />
          <Text className="text-koa-danger font-medium text-base">
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
