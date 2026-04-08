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
import { FadeIn } from "@/components/shared/fade-in";

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
];

export default function ProfileScreen() {
  const { user, profile, profileComplete, logout, refreshProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      dob: profile?.dob ? new Date(profile.dob).toISOString().split("T")[0] : "",
      mauna: profile?.mauna ?? "",
      aina: profile?.aina ?? "",
      wai: profile?.wai ?? "",
      kula: profile?.kula ?? "",
      role: profile?.role ?? "",
    });
  }, [profile]);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      await refreshProfile();
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="px-7 pt-24 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn>
          <Text
            className="text-3xl font-bold text-gray-900 mb-1"
            style={{ fontFamily: "Newsreader_400Regular" }}
          >
            Profile
          </Text>
          <Text className="text-base text-gray-500 mb-6">
            {user?.email}
          </Text>
          <View className="h-px bg-gray-100 mb-6" />
        </FadeIn>

        <FadeIn delay={100}>
          <View
            className="rounded-2xl p-5 mb-4 bg-gray-50"
            style={{ borderWidth: 1, borderColor: "#E7E5E4" }}
          >
            <Text className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "#15803D", opacity: 0.7 }}>
              Account
            </Text>
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-500 text-base">Username</Text>
              <Text className="text-gray-900 text-base font-semibold">
                {user?.username}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-500 text-base">Email</Text>
              <Text className="text-gray-900 text-base font-semibold">
                {user?.email}
              </Text>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={200}>
          {!profileComplete && (
            <View className="rounded-2xl p-4 mb-4 bg-amber-50" style={{ borderWidth: 1, borderColor: "#FCD34D" }}>
              <Text className="text-sm font-bold uppercase tracking-wide" style={{ color: "#92400E", opacity: 0.85 }}>
                Incomplete Profile
              </Text>
              <Text className="text-sm mt-2 leading-6" style={{ color: "#78350F" }}>
                Add your name, date of birth, and ʻāina before creating a KILO entry.
              </Text>
            </View>
          )}

          <View
            className="rounded-2xl p-5 mb-4 bg-gray-50"
            style={{ borderWidth: 1, borderColor: "#E7E5E4" }}
          >
            <Text className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: "#15803D", opacity: 0.7 }}>
              Profile
            </Text>

            {FIELDS.map(({ key, label, placeholder }) => (
              <View key={key} className="mb-4">
                <Text className="text-base font-semibold text-gray-700 mb-1.5">
                  {label}
                </Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base bg-white"
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  value={form[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  autoCapitalize={key === "dob" ? "none" : "words"}
                  autoCorrect={false}
                  editable={!isSaving}
                />
              </View>
            ))}
          </View>
        </FadeIn>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        <FadeIn delay={300}>
          <TouchableOpacity
            className="rounded-xl py-4 items-center mb-4"
            style={{ backgroundColor: isSaving || saved ? "#6EBE80" : "#15803D" }}
            onPress={handleSave}
            disabled={isSaving || saved}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {saved ? "Saved!" : "Save Profile"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-xl py-4 items-center border border-red-200 flex-row justify-center gap-x-2"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
            <Text className="font-semibold text-lg" style={{ color: "#B91C1C" }}>
              Log Out
            </Text>
          </TouchableOpacity>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
