import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch, getToken } from "@/lib/api";
import { FadeIn } from "@/components/shared/fade-in";
import { GuidingPrompts } from "@/components/kilo/guiding-prompts";
import { AudioRecorder } from "@/components/kilo/audio-recorder";
import { getTheme } from "@/components/kilo/question-theme";
import { QUESTIONS } from "@/shared/types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type PhotoQuestion = "q1" | "q2" | "q3";
type PhotoData = { uri: string; mimeType: string };

export default function EditKiloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [newPhotos, setNewPhotos] = useState<Record<PhotoQuestion, PhotoData | null>>({ q1: null, q2: null, q3: null });
  const [existingPhotos, setExistingPhotos] = useState<Record<PhotoQuestion, boolean>>({ q1: false, q2: false, q3: false });
  const [serverPhotoSources, setServerPhotoSources] = useState<Record<PhotoQuestion, { uri: string; headers: Record<string, string> } | null>>({ q1: null, q2: null, q3: null });

  useEffect(() => {
    (async () => {
      try {
        const { entry } = await apiFetch<{
          entry: {
            q1: string; q2: string | null; q3: string | null; q4: string | null;
            q1_photo_path: string | null; q2_photo_path: string | null; q3_photo_path: string | null;
          };
        }>(`/api/kilo?id=${id}`);

        setAnswers({
          q1: entry.q1,
          q2: entry.q2 ?? "",
          q3: entry.q3 ?? "",
          q4: entry.q4 ?? "",
        });

        const session = await getToken();
        const newExisting: Record<PhotoQuestion, boolean> = { q1: false, q2: false, q3: false };
        const newSources: Record<PhotoQuestion, { uri: string; headers: Record<string, string> } | null> = { q1: null, q2: null, q3: null };

        for (const q of ["q1", "q2", "q3"] as PhotoQuestion[]) {
          if (entry[`${q}_photo_path`]) {
            newExisting[q] = true;
            if (session) {
              newSources[q] = {
                uri: `${BASE_URL}/api/kilo/photo?id=${id}&question=${q}`,
                headers: {
                  "x-session-token": session.token,
                  "x-session-type": session.tokenType,
                },
              };
            }
          }
        }
        setExistingPhotos(newExisting);
        setServerPhotoSources(newSources);
      } catch {
        setError("Failed to load entry.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleTakePhoto = async (q: PhotoQuestion) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setNewPhotos((prev) => ({ ...prev, [q]: { uri: a.uri, mimeType: a.mimeType ?? "image/jpeg" } }));
      setExistingPhotos((prev) => ({ ...prev, [q]: false }));
      setServerPhotoSources((prev) => ({ ...prev, [q]: null }));
    }
  };

  const handleRemovePhoto = (q: PhotoQuestion) => {
    setNewPhotos((prev) => ({ ...prev, [q]: null }));
    setExistingPhotos((prev) => ({ ...prev, [q]: false }));
    setServerPhotoSources((prev) => ({ ...prev, [q]: null }));
  };

  const handleSave = async () => {
    if (!answers.q1.trim()) {
      setError("Question 1 is required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("id", String(id));
      formData.append("q1", answers.q1);
      if (answers.q2) formData.append("q2", answers.q2);
      if (answers.q3) formData.append("q3", answers.q3);
      if (answers.q4) formData.append("q4", answers.q4);

      for (const q of ["q1", "q2", "q3"] as PhotoQuestion[]) {
        if (newPhotos[q]) {
          formData.append(`${q}_photo`, {
            uri: newPhotos[q]!.uri,
            name: `${q}_photo.jpg`,
            type: newPhotos[q]!.mimeType,
          } as never);
        } else if (existingPhotos[q]) {
          formData.append(`keep_${q}_photo`, "true");
        }
      }

      await apiFetch("/api/kilo", {
        method: "PUT",
        body: formData,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
    } finally {
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
            const qKey = q.id as PhotoQuestion;
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

                  {/* Audio recorder */}
                  <View style={{ marginTop: 10 }}>
                    <AudioRecorder
                      onTranscription={(text) =>
                        setAnswers((a) => ({
                          ...a,
                          [q.id]: a[q.id as keyof typeof a]
                            ? a[q.id as keyof typeof a] + " " + text
                            : text,
                        }))
                      }
                      accentColor={theme.accent}
                      disabled={isSubmitting}
                    />
                  </View>

                  {/* Photo section (q1, q2, q3 only) */}
                  {q.picture && (
                    <View style={{ marginTop: 12 }}>
                      {newPhotos[qKey] ? (
                        /* New local photo selected */
                        <View>
                          <Image
                            source={{ uri: newPhotos[qKey]!.uri }}
                            style={{ width: "100%", height: 180, borderRadius: 14 }}
                            resizeMode="cover"
                          />
                          <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 10 }}>
                            <TouchableOpacity onPress={() => handleRemovePhoto(qKey)}>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: "#B91C1C" }}>
                                Remove
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleTakePhoto(qKey)}>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.accent }}>
                                Retake
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : existingPhotos[qKey] && serverPhotoSources[qKey] ? (
                        /* Existing server photo */
                        <View>
                          <Image
                            source={serverPhotoSources[qKey]!}
                            style={{ width: "100%", height: 180, borderRadius: 14 }}
                            resizeMode="cover"
                          />
                          <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 10 }}>
                            <TouchableOpacity onPress={() => handleRemovePhoto(qKey)}>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: "#B91C1C" }}>
                                Remove
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleTakePhoto(qKey)}>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.accent }}>
                                Replace
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* No photo — show add button */
                        <TouchableOpacity
                          onPress={() => handleTakePhoto(qKey)}
                          activeOpacity={0.6}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            paddingVertical: 6,
                          }}
                        >
                          <Ionicons name="camera-outline" size={16} color={theme.stepLabel} />
                          <Text style={{ color: theme.stepLabel, fontSize: 13, fontWeight: "500" }}>
                            Add a photo
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </FadeIn>
            );
          })}
        </ScrollView>

        {/* Top fade */}
        <LinearGradient
          colors={["#FFFFFF", "#FFFFFF00"]}
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24 }}
        />

        {/* Bottom fade */}
        <LinearGradient
          colors={["#FFFFFF00", "#FFFFFF"]}
          pointerEvents="none"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36 }}
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
