import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { profileUpdateSchema } from "@kilo/shared/schemas";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
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

type Step = {
  key: "identity" | "place" | "finish";
  label: string;
  title: string;
  description: string;
  fields: Array<{
    key: keyof ProfileForm;
    label: string;
    placeholder: string;
    keyboardType?: "default" | "numeric";
  }>;
};

const STEPS: Step[] = [
  {
    key: "identity",
    label: "About You",
    title: "Basic details",
    description: "Add the core details needed to set up your profile.",
    fields: [
      { key: "first_name", label: "First name", placeholder: "Enter your first name" },
      { key: "last_name", label: "Last name", placeholder: "Enter your last name" },
      { key: "dob", label: "Date of birth", placeholder: "Enter your date of birth", keyboardType: "numeric" },
    ],
  },
  {
    key: "place",
    label: "Place",
    title: "Connection to place",
    description: "Moku is the subdivision of the island you identify with most. Mauna and wai are optional, but can help connect you to others in the same area.",
    fields: [
      { key: "aina", label: "Moku", placeholder: "Hilo" },
      { key: "mauna", label: "Mauna", placeholder: "Mauna Kea" },
      { key: "wai", label: "Wai", placeholder: "Waiākea" },
    ],
  },
  {
    key: "finish",
    label: "Review",
    title: "Ready to continue",
    description: "You can update the rest of your profile later.",
    fields: [],
  },
];

function toForm(profile: ReturnType<typeof useAuth>["profile"]): ProfileForm {
  return {
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    dob: profile?.dob ? new Date(profile.dob).toISOString().split("T")[0] : "",
    mauna: profile?.mauna ?? "",
    aina: profile?.aina ?? "",
    wai: profile?.wai ?? "",
    kula: profile?.kula ?? "",
    role: profile?.role ?? "",
  };
}

function stepComplete(form: ProfileForm, step: Step) {
  if (step.key === "finish") return true;
  return step.fields.every((field) => {
    if (field.key === "mauna" || field.key === "wai") return true;
    return form[field.key].trim().length > 0;
  });
}

export default function OnboardingScreen() {
  const { user, profile, profileComplete, refreshProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(toForm(profile));
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileComplete) {
      router.replace("/(protected)");
    }
  }, [profileComplete]);

  if (profileComplete) return null;

  const step = STEPS[stepIndex];
  const progress = useMemo(
    () => Math.round((STEPS.filter((item) => stepComplete(form, item)).length / STEPS.length) * 100),
    [form]
  );

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const handleContinue = async () => {
    if (!stepComplete(form, step)) {
      setError("Fill in the required fields before continuing.");
      return;
    }

    if (stepIndex < STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success || !form.first_name.trim() || !form.last_name.trim() || !form.dob.trim() || !form.aina.trim()) {
      setError("First name, last name, date of birth, and ʻāina are required.");
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      await refreshProfile();
      router.replace("/(protected)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              color: "#111827",
              fontSize: 34,
              lineHeight: 38,
              fontFamily: "Newsreader_400Regular",
            }}
          >
            Profile
          </Text>
          <Text style={{ marginTop: 10, color: "#6B7280", fontSize: 15, lineHeight: 24 }}>
            Fill in a few details before your first KILO.
          </Text>
          <Text style={{ marginTop: 8, color: "#9CA3AF", fontSize: 14 }}>
            {user?.email}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          {STEPS.map((item, index) => {
            const complete = stepComplete(form, item);
            const active = index === stepIndex;
            return (
              <View
                key={item.key}
                style={{
                  flex: 1,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: active ? "#15803D" : "#E5E7EB",
                  backgroundColor: active ? "#F0FDF4" : "#FFFFFF",
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ color: "#9CA3AF", fontSize: 10, letterSpacing: 2 }}>
                  0{index + 1}
                </Text>
                <Text style={{ marginTop: 12, color: "#111827", fontSize: 14, fontWeight: "700" }}>
                  {item.label}
                </Text>
                <Text style={{ marginTop: 4, color: "#6B7280", fontSize: 12, lineHeight: 18 }}>
                  {complete ? "Complete" : item.title}
                </Text>
              </View>
            );
          })}
        </View>        

        <FadeIn key={step.key} duration={320} translateY={14}>
          <View
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: "#FFFFFF",
              padding: 24,
            }}
          >
            <Text style={{ color: "#15803D", fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: "700" }}>
              {step.label}
            </Text>
            <Text
              style={{
                marginTop: 12,
                color: "#111827",
                fontSize: 30,
                lineHeight: 34,
                fontFamily: "Newsreader_400Regular",
              }}
            >
              {step.title}
            </Text>
            <Text style={{ marginTop: 14, color: "#6B7280", fontSize: 14, lineHeight: 24 }}>
              {step.description}
            </Text>

            {step.fields.length > 0 ? (
              <View style={{ marginTop: 28, gap: 18 }}>
                {step.fields.map((field) => (
                  <View key={field.key}>
                    <Text style={{ marginBottom: 8, color: "#374151", fontSize: 14, fontWeight: "600" }}>
                      {field.label}
                    </Text>
                    <TextInput
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        backgroundColor: "#F9FAFB",
                        color: "#111827",
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        fontSize: 16,
                      }}
                      placeholder={field.placeholder}
                      placeholderTextColor="#9CA3AF"
                      value={form[field.key]}
                      onChangeText={(value) => updateField(field.key, value)}
                      autoCapitalize={field.key === "dob" ? "none" : "words"}
                      autoCorrect={false}
                      keyboardType={field.keyboardType ?? "default"}
                      editable={!isSaving}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View
                style={{
                  marginTop: 28,
                  borderRadius: 20,
                  backgroundColor: "#F0FDF4",
                  borderWidth: 1,
                  borderColor: "#BBF7D0",
                  padding: 16,
                }}
              >
                <Text style={{ color: "#166534", fontSize: 14, lineHeight: 24 }}>
                  Required now: first name, last name, date of birth, and ahupuaʻa.
                </Text>
                <Text style={{ marginTop: 8, color: "#15803D", fontSize: 14, lineHeight: 24 }}>
                  Mauna and wai can stay blank if you do not know them yet.
                </Text>
              </View>
            )}

            {error && (
              <View
                style={{
                  marginTop: 20,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  backgroundColor: "#FEF2F2",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: "#B91C1C", fontSize: 14 }}>{error}</Text>
              </View>
            )}

            <View style={{ marginTop: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => setStepIndex((current) => Math.max(current - 1, 0))}
                disabled={stepIndex === 0 || isSaving}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "600" }}>
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  borderRadius: 999,
                  backgroundColor: "#15803D",
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  minWidth: 170,
                  alignItems: "center",
                }}
                onPress={handleContinue}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
                    {stepIndex === STEPS.length - 1 ? "Finish onboarding" : "Continue"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
