import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { apiFetch, getToken } from "@/lib/api";

const QUESTIONS = [
  { id: "q1", question: "What is your internal weather today?", required: true },
  { id: "q2", question: "What do you see outside today?",       required: true, picture: true },
  { id: "q3", question: "What are you excited to do today?",   required: true },
];

type PhotoData = { uri: string; base64: string; mimeType: string };

export default function KiloScreen() {
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState({ q1: "", q2: "", q3: "" });
  const [showTyping, setShowTyping] = useState(false);
  const [photo, setPhoto]         = useState<PhotoData | null>(null);
  const [isRecording, setIsRecording]     = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const current  = QUESTIONS[step];
  const answer   = answers[current.id as keyof typeof answers];
  const isLast   = step === QUESTIONS.length - 1;

  const setAnswer = (val: string) =>
    setAnswers((a) => ({ ...a, [current.id]: val }));

  const goBack = () => {
    setError(null);
    setShowTyping(false);
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  // Voice recording
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
          setShowTyping(true); // show result in text box
        }
      }
    } catch {
      // Transcription not configured — show typing fallback
      setShowTyping(true);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Photo
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
      {/* Header */}
      <View className="px-6 pt-14 pb-3 border-b border-gray-100 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900">{current.question}</Text>
        <View className="flex-row items-center gap-x-3">
          <TouchableOpacity onPress={goBack} className="flex-row items-center gap-x-1">
            <Text className="text-gray-500 text-sm">✕  Cancel</Text>
          </TouchableOpacity>
          <Text className="text-gray-400 text-sm">{step + 1} / {QUESTIONS.length}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="bg-gray-100 h-1">
        <View className="bg-gray-900 h-1" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
      </View>

      <ScrollView
        contentContainerClassName="flex-grow px-6 py-8 gap-y-6"
        keyboardShouldPersistTaps="handled"
      >
        {current.required && (
          <Text className="text-red-500 text-sm font-medium">* Required</Text>
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Voice recording — primary input */}
        {!showTyping && (
          <View className="items-center gap-y-4 py-6">
            {isTranscribing ? (
              <View className="items-center gap-y-3">
                <ActivityIndicator size="large" color="#16a34a" />
                <Text className="text-gray-500 text-sm">Transcribing your response...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  className={`w-24 h-24 rounded-full items-center justify-center ${isRecording ? "bg-red-500" : "bg-green-600"}`}
                >
                  <Text className="text-4xl">{isRecording ? "⏹" : "🎙"}</Text>
                </TouchableOpacity>
                <Text className="text-gray-500 text-sm">
                  {isRecording ? "Tap to stop recording" : "Tap to start recording"}
                </Text>
                {answer.trim() !== "" && (
                  <View className="bg-gray-50 rounded-xl px-4 py-3 w-full">
                    <Text className="text-gray-700 text-sm italic">"{answer}"</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Typing fallback */}
        {showTyping ? (
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base min-h-32"
            placeholder="Type your answer here..."
            placeholderTextColor="#9ca3af"
            value={answer}
            onChangeText={setAnswer}
            multiline
            textAlignVertical="top"
            autoFocus
            editable={!isSubmitting}
          />
        ) : (
          <TouchableOpacity
            onPress={() => setShowTyping(true)}
            className="flex-row items-center justify-center gap-x-2"
          >
            <Text className="text-gray-400 text-base">⌨️</Text>
            <Text className="text-gray-500 text-sm">Prefer to type instead?</Text>
          </TouchableOpacity>
        )}

        {/* Photo (Q2 only) */}
        {current.picture && (
          <View className="gap-y-2">
            {photo ? (
              <View>
                <Image
                  source={{ uri: photo.uri }}
                  className="w-full h-48 rounded-xl"
                  resizeMode="cover"
                />
                <TouchableOpacity onPress={() => setPhoto(null)} className="mt-2 items-center">
                  <Text className="text-red-500 text-sm">Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text className="text-gray-400 text-xs mb-2">Take a photo of your Kilo (optional)</Text>
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  className="flex-row items-center gap-x-2 border border-gray-300 rounded-xl px-4 py-3 self-start"
                >
                  <Text className="text-base">📷</Text>
                  <Text className="text-gray-700 text-sm font-medium">Open Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View className="flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
        <TouchableOpacity
          onPress={goBack}
          className="flex-row items-center gap-x-1 border border-gray-200 rounded-xl px-5 py-3"
        >
          <Text className="text-gray-600 text-sm font-medium">‹  Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={isSubmitting}
          className={`flex-row items-center gap-x-1 rounded-xl px-6 py-3 ${isSubmitting ? "bg-gray-400" : "bg-gray-900"}`}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text className="text-white text-sm font-semibold">
                {isLast ? "Save Entry" : "Next  ›"}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
