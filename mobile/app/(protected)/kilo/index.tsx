import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/api";

const QUESTIONS = [
  { id: "q1", question: "What is your internal weather today?", required: true },
  { id: "q2", question: "What do you see outside today?", required: true, picture: true },
  { id: "q3", question: "What are you excited to do today?", required: true, voice: true },
];

type PhotoData = { uri: string; base64: string; mimeType: string };

export default function KiloScreen() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "" });
  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const current = QUESTIONS[step];
  const answer = answers[current.id as keyof typeof answers];
  const isLast = step === QUESTIONS.length - 1;

  const setAnswer = (val: string) =>
    setAnswers((a) => ({ ...a, [current.id]: val }));

  // Photo picker
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        base64: asset.base64 ?? "",
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        base64: asset.base64 ?? "",
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  // Voice recording
  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Microphone access is required.");
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
      if (!uri) throw new Error("No recording file found");

      const session = await getToken();
      const formData = new FormData();
      formData.append("file", { uri, name: "audio.m4a", type: "audio/m4a" } as never);

      const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
      const res = await fetch(`${BASE_URL}/api/audio/transcribe`, {
        method: "POST",
        headers: session ? { "x-session-token": session.token, "x-session-type": session.tokenType } : {},
        body: formData,
      });
      if (res.ok) {
        const { text } = await res.json();
        if (text) setAnswer((answer ? answer + " " : "") + text);
      }
    } catch {
      // Transcription failed silently — user can type manually
    } finally {
      setIsTranscribing(false);
    }
  };

  // Submit
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (current.required && !answer.trim()) {
      setError("Please answer this question before continuing.");
      return;
    }
    setError(null);
    if (isLast) handleSubmit();
    else setStep((s) => s + 1);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => step === 0 ? router.back() : setStep((s) => s - 1)}>
          <Text className="text-blue-600 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">New KILO Entry</Text>
        <Text className="text-sm text-gray-400">{step + 1} / {QUESTIONS.length}</Text>
      </View>

      {/* Progress bar */}
      <View className="bg-gray-200 h-1">
        <View
          className="bg-blue-600 h-1"
          style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
        />
      </View>

      <ScrollView
        contentContainerClassName="px-6 py-8 gap-y-6 pb-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-xl font-bold text-gray-900 leading-snug">
          {current.question}
        </Text>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Text input */}
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base min-h-32"
          placeholder="Write your answer here..."
          placeholderTextColor="#9ca3af"
          value={answer}
          onChangeText={setAnswer}
          multiline
          textAlignVertical="top"
          editable={!isSubmitting}
        />

        {/* Photo (Q2 only) */}
        {current.picture && (
          <View className="gap-y-3">
            {photo ? (
              <View>
                <Image
                  source={{ uri: photo.uri }}
                  className="w-full h-48 rounded-xl"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  className="mt-2 items-center"
                >
                  <Text className="text-red-500 text-sm">Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row gap-x-3">
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  className="flex-1 bg-white border border-gray-200 rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-700 text-sm font-medium">📷 Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePickFromLibrary}
                  className="flex-1 bg-white border border-gray-200 rounded-xl py-3 items-center"
                >
                  <Text className="text-gray-700 text-sm font-medium">🖼️ Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Voice (Q3 only) */}
        {current.voice && (
          <View>
            {isTranscribing ? (
              <View className="flex-row items-center gap-x-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <ActivityIndicator size="small" color="#2563EB" />
                <Text className="text-gray-500 text-sm">Transcribing...</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                className={`rounded-xl py-3 items-center ${isRecording ? "bg-red-500" : "bg-white border border-gray-200"}`}
              >
                <Text className={`text-sm font-medium ${isRecording ? "text-white" : "text-gray-700"}`}>
                  {isRecording ? "⏹ Stop Recording" : "🎙 Record Answer"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Next / Submit */}
        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${isSubmitting ? "bg-blue-400" : "bg-blue-600"}`}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {isLast ? "Submit Entry" : "Next →"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
