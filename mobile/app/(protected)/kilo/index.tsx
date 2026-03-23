import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getToken } from "@/lib/api";

const QUESTIONS = [
  { id: "q1", question: "What is your internal weather today?", required: true },
  { id: "q2", question: "What do you see outside today?",       required: true, picture: true },
  { id: "q3", question: "What are you excited to do today?",   required: true },
];

type PhotoData = { uri: string; base64: string; mimeType: string };

export default function KiloScreen() {
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState({ q1: "", q2: "", q3: "" });
  const [showTyping, setShowTyping] = useState(false);
  const [photo, setPhoto]           = useState<PhotoData | null>(null);
  const [isRecording, setIsRecording]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const current = QUESTIONS[step];
  const answer  = answers[current.id as keyof typeof answers];
  const isLast  = step === QUESTIONS.length - 1;

  const setAnswer = (val: string) =>
    setAnswers((a) => ({ ...a, [current.id]: val }));

  const goBack = () => {
    setError(null);
    setShowTyping(false);
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  // ── Voice recording ────────────────────────────────────────────
  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Microphone access is required to record.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      setError("Failed to start recording.");
    }
  };

  const handleStopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error("No recording found");

      const session = await getToken();
      const formData = new FormData();
      formData.append("file", { uri, name: "audio.m4a", type: "audio/m4a" } as never);

      const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
      const res = await fetch(`${BASE_URL}/api/audio/transcribe`, {
        method: "POST",
        headers: session
          ? { "x-session-token": session.token, "x-session-type": session.tokenType }
          : {},
        body: formData,
      });
      if (res.ok) {
        const { text } = await res.json();
        if (text) {
          setAnswer((answer ? answer + " " : "") + text);
          setShowTyping(true);
        }
      } else {
        setShowTyping(true);
      }
    } catch {
      // Transcription not configured — show typing fallback
      setShowTyping(true);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Photo ──────────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images", base64: true, quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPhoto({ uri: a.uri, base64: a.base64 ?? "", mimeType: a.mimeType ?? "image/jpeg" });
    }
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/api/kilo", {
        method: "POST",
        body: JSON.stringify({
          q1: answers.q1,
          q2: answers.q2 || null,
          q3: answers.q3 || null,
          photo_base64: photo?.base64 ?? null,
          photo_mime_type: photo?.mimeType ?? null,
        }),
      });
      router.replace("/(protected)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (current.required && !answer.trim()) {
      setError("Please answer this question before continuing.");
      return;
    }
    setError(null);
    setShowTyping(false);
    if (isLast) handleSubmit();
    else setStep((s) => s + 1);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Header: title · step counter · cancel ── */}
      <View className="px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">KILO</Text>
        <Text className="text-sm text-gray-400">
          {step + 1} / {QUESTIONS.length}
        </Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-sm text-gray-500 font-medium">Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      <View className="bg-gray-100 h-1">
        <View
          className="bg-gray-900 h-1"
          style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Question in content area ── */}
        <Text className="text-xl font-bold text-gray-900 leading-snug mb-1">
          {current.question}
        </Text>
        {current.required && (
          <Text className="text-red-500 text-xs mb-6">* Required</Text>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* ── Voice recording (primary input) ── */}
        {!showTyping && (
          <View className="items-center" style={{ paddingVertical: 32, gap: 16 }}>
            {isTranscribing ? (
              <View className="items-center" style={{ gap: 12 }}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text className="text-gray-500 text-sm">Transcribing your response...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  style={{
                    width: 112, height: 112, borderRadius: 56,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: isRecording ? "#ef4444" : "#16a34a",
                    shadowColor: "#000", shadowOpacity: 0.12,
                    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
                    elevation: 4,
                  }}
                >
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={44}
                    color="white"
                  />
                </TouchableOpacity>
                <Text className="text-gray-500 text-sm">
                  {isRecording ? "Tap to stop recording" : "Tap to start recording"}
                </Text>
                {answer.trim() !== "" && (
                  <View
                    className="bg-gray-50 border border-gray-200 rounded-xl w-full"
                    style={{ paddingHorizontal: 16, paddingVertical: 12, marginTop: 4 }}
                  >
                    <Text className="text-gray-700 text-sm italic">"{answer}"</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Typing fallback ── */}
        {showTyping ? (
          <TextInput
            style={{
              backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
              borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
              fontSize: 16, color: "#111827", minHeight: 128, textAlignVertical: "top",
            }}
            placeholder="Type your answer here..."
            placeholderTextColor="#9ca3af"
            value={answer}
            onChangeText={setAnswer}
            multiline
            autoFocus
            editable={!isSubmitting}
          />
        ) : (
          <TouchableOpacity
            onPress={() => setShowTyping(true)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}
          >
            <Ionicons name="keyboard-outline" size={18} color="#9ca3af" />
            <Text className="text-gray-500 text-sm">Prefer to type instead?</Text>
          </TouchableOpacity>
        )}

        {/* ── Photo (Q2 only) ── */}
        {current.picture && (
          <View style={{ marginTop: 24, gap: 8 }}>
            {photo ? (
              <View>
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: "100%", height: 192, borderRadius: 12 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  style={{ marginTop: 8, alignItems: "center" }}
                >
                  <Text className="text-red-500 text-sm font-medium">Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text className="text-gray-400 text-xs mb-2">
                  Optional: take a photo of your Kilo
                </Text>
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12,
                    paddingHorizontal: 16, paddingVertical: 12, alignSelf: "flex-start",
                  }}
                >
                  <Ionicons name="camera-outline" size={20} color="#374151" />
                  <Text className="text-gray-700 text-sm font-medium">Open Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom navigation ── */}
      <View
        className="border-t border-gray-100 bg-white"
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16 }}
      >
        <TouchableOpacity
          onPress={goBack}
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
          onPress={handleNext}
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
            <>
              <Text className="text-white text-sm font-semibold">
                {isLast ? "Save Entry" : "Next"}
              </Text>
              {!isLast && <Ionicons name="chevron-forward" size={16} color="white" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
