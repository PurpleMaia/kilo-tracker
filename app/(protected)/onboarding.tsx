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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { profileUpdateSchema } from "../../src/shared/schemas";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { FadeIn } from "@/components/shared/fade-in";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

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
  key: "identity" | "place" | "consent";
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
    key: "consent",
    label: "Consent",
    title: "Storage and sharing",
    description: "Choose how your KILO entries should be handled, then confirm your consent.",
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
  if (step.key === "consent") return true;
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
  const [consentChecked, setConsentChecked] = useState(profile?.consent_privacy_ack === true);
  const [sharingChoice, setSharingChoice] = useState<"private" | "shared" | null>(
    profile?.encrypt_kilo_entries === true && profile?.share_kilo_entries === false
      ? "private"
      : profile?.encrypt_kilo_entries === false && profile?.share_kilo_entries === true
        ? "shared"
        : null
  );
  const privateSelected = useSharedValue(sharingChoice === "private" ? 1 : 0);
  const sharedSelected = useSharedValue(sharingChoice === "shared" ? 1 : 0);
  const consentSelected = useSharedValue(consentChecked ? 1 : 0);

  useEffect(() => {
    privateSelected.value = withTiming(sharingChoice === "private" ? 1 : 0, { duration: 220 });
    sharedSelected.value = withTiming(sharingChoice === "shared" ? 1 : 0, { duration: 220 });
  }, [privateSelected, sharedSelected, sharingChoice]);

  useEffect(() => {
    consentSelected.value = withTiming(consentChecked ? 1 : 0, { duration: 180 });
  }, [consentChecked, consentSelected]);

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

  const privateCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(privateSelected.value, [0, 1], ["#F0FDF4", "#15803D"]),
    borderColor: interpolateColor(privateSelected.value, [0, 1], ["#BBF7D0", "#15803D"]),
  }));

  const sharedCardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sharedSelected.value, [0, 1], ["#FFFFFF", "#15803D"]),
    borderColor: interpolateColor(sharedSelected.value, [0, 1], ["#D1D5DB", "#15803D"]),
  }));

  const consentRowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(consentSelected.value, [0, 1], ["#FFFFFF", "#F0FDF4"]),
    borderColor: interpolateColor(consentSelected.value, [0, 1], ["#D1D5DB", "#15803D"]),
  }));

  const consentBoxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(consentSelected.value, [0, 1], ["#9CA3AF", "#15803D"]),
  }));

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

    if (!consentChecked || !sharingChoice) {
      setError("Choose a storage option and confirm consent before continuing.");
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          consent_privacy_ack: true,
          share_kilo_entries: sharingChoice === "shared",
          encrypt_kilo_entries: sharingChoice === "private",
        }),
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
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                onPress={() => setStepIndex(index)}
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
              </TouchableOpacity>
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
              <View style={{ marginTop: 28, gap: 14 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setSharingChoice("private");
                    setError(null);
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        borderRadius: 20,
                        borderWidth: 1,
                        padding: 16,
                      },
                      privateCardStyle,
                    ]}
                  >
                  <Text style={{ color: sharingChoice === "private" ? "#FFFFFF" : "#166534", fontSize: 15, fontWeight: "700" }}>
                    Keep my KILO private and encrypted at rest
                  </Text>
                  <Text style={{ marginTop: 8, color: sharingChoice === "private" ? "rgba(255,255,255,0.88)" : "#166534", fontSize: 14, lineHeight: 24 }}>
                    Your entries stay private by default. They are stored using our encrypted-at-rest infrastructure and are not shared with others.
                  </Text>
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setSharingChoice("shared");
                    setError(null);
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        borderRadius: 20,
                        borderWidth: 1,
                        padding: 16,
                      },
                      sharedCardStyle,
                    ]}
                  >
                  <Text style={{ color: sharingChoice === "shared" ? "#FFFFFF" : "#111827", fontSize: 15, fontWeight: "700" }}>
                    Share my KILO with others
                  </Text>
                  <Text style={{ marginTop: 8, color: sharingChoice === "shared" ? "rgba(255,255,255,0.88)" : "#6B7280", fontSize: 14, lineHeight: 24 }}>
                    Choosing sharing opts you out of app-level encrypted handling for those entries so they can be shared more directly with others.
                  </Text>
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setConsentChecked((current) => !current);
                    setError(null);
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        padding: 14,
                      },
                      consentRowStyle,
                    ]}
                  >
                    <Animated.View
                      style={[
                        {
                          marginTop: 2,
                          height: 20,
                          width: 20,
                          borderRadius: 6,
                          borderWidth: 1.5,
                          backgroundColor: "#FFFFFF",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                        consentBoxStyle,
                      ]}
                    >
                      {consentChecked ? (
                        <Ionicons name="checkmark" size={14} color="#15803D" />
                      ) : null}
                    </Animated.View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#111827", fontSize: 14, lineHeight: 22 }}>
                        I understand how my KILO entries are stored and I consent to this storage approach.
                      </Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>
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
