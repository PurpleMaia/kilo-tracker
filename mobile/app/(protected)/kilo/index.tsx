import { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
// import { Audio } from "expo-av"; // Used by legacy API-based transcription
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard } from "lucide-react-native";
import { apiFetch } from "@/lib/api";
// import { getToken } from "@/lib/api"; // Used by legacy API-based transcription
import { FadeIn } from "@/components/shared/fade-in";
import { GuidingPrompts } from "@/components/shared/guiding-prompts";
import { QUESTIONS } from "@kilo/shared/types";

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
  // const recordingRef = useRef<Audio.Recording | null>(null); // Used by legacy API-based transcription
  const [liveTranscript, setLiveTranscript] = useState("");

  // Reset all state whenever the screen gains focus (ensures a fresh session)
  useFocusEffect(
    useCallback(() => {
      setStep(0);
      setAnswers({ q1: "", q2: "", q3: "" });
      setShowTyping(false);
      setPhoto(null);
      setIsRecording(false);
      setIsTranscribing(false);
      setIsSubmitting(false);
      setError(null);
      setLiveTranscript("");
    }, [])
  );

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

  // ── Voice recognition (on-device via expo-speech-recognition) ──
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript ?? "";
    if (event.isFinal) {
      const currentAnswer = answers[current.id as keyof typeof answers];
      setAnswer((currentAnswer ? currentAnswer + " " : "") + transcript);
      setLiveTranscript("");
      setShowTyping(true);
    } else {
      setLiveTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setIsRecording(false);
    setIsTranscribing(false);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsRecording(false);
    setIsTranscribing(false);
    setError(`Speech recognition error: ${event.error}`);
    setShowTyping(true);
  });

  const handleStartRecording = async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert("Permission needed", "Microphone access is required to record.");
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
      });
      setIsRecording(true);
      setError(null);
    } catch {
      setError("Failed to start speech recognition.");
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsTranscribing(true);
    ExpoSpeechRecognitionModule.stop();
  };

  // ── Legacy: API-based transcription (commented out) ──────────
  // const handleStartRecordingViaAPI = async () => {
  //   try {
  //     const { status } = await Audio.requestPermissionsAsync();
  //     if (status !== "granted") {
  //       Alert.alert("Permission needed", "Microphone access is required to record.");
  //       return;
  //     }
  //     await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  //     const { recording } = await Audio.Recording.createAsync({
  //       android: {
  //         extension: ".wav",
  //         outputFormat: Audio.AndroidOutputFormat.DEFAULT,
  //         audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
  //         sampleRate: 16000,
  //         numberOfChannels: 1,
  //         bitRate: 128000,
  //       },
  //       ios: {
  //         extension: ".wav",
  //         outputFormat: Audio.IOSOutputFormat.LINEARPCM,
  //         audioQuality: Audio.IOSAudioQuality.HIGH,
  //         sampleRate: 16000,
  //         numberOfChannels: 1,
  //         bitRate: 128000,
  //         linearPCMBitDepth: 16,
  //         linearPCMIsBigEndian: false,
  //         linearPCMIsFloat: false,
  //       },
  //       web: {},
  //     });
  //     recordingRef.current = recording;
  //     setIsRecording(true);
  //   } catch {
  //     setError("Failed to start recording.");
  //   }
  // };
  //
  // const handleStopRecordingViaAPI = async () => {
  //   if (!recordingRef.current) return;
  //   setIsRecording(false);
  //   setIsTranscribing(true);
  //   try {
  //     await recordingRef.current.stopAndUnloadAsync();
  //     const uri = recordingRef.current.getURI();
  //     recordingRef.current = null;
  //     if (!uri) throw new Error("No recording found");
  //
  //     const session = await getToken();
  //     const formData = new FormData();
  //     formData.append("file", { uri, name: "audio.wav", type: "audio/wav" } as never);
  //
  //     const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
  //     const res = await fetch(`${BASE_URL}/api/audio/transcribe`, {
  //       method: "POST",
  //       headers: session
  //         ? { "x-session-token": session.token, "x-session-type": session.tokenType }
  //         : {},
  //       body: formData,
  //     });
  //     if (res.ok) {
  //       const { text } = await res.json();
  //       if (text) {
  //         setAnswer((answer ? answer + " " : "") + text);
  //         setShowTyping(true);
  //       } else {
  //         setError("Transcription returned no text. Try again or type your answer.");
  //         setShowTyping(true);
  //       }
  //     } else {
  //       const body = await res.json().catch(() => ({}));
  //       setError(`Transcription failed (${res.status}): ${body.error ?? "Unknown error"}`);
  //       setShowTyping(true);
  //     }
  //   } catch (e) {
  //     setError(`Transcription error: ${e instanceof Error ? e.message : String(e)}`);
  //     setShowTyping(true);
  //   } finally {
  //     setIsTranscribing(false);
  //   }
  // };

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
      {/* ── Header ── */}
      <View className="px-6 pt-14 pb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">KILO</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color="#78716C" />
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      <View className="flex-row items-center px-6 mb-4" style={{ gap: 6 }}>
        {QUESTIONS.map((_, i) => (
          <View
            key={i}
            className="rounded-full"
            style={{
              height: 5,
              flex: i === step ? 2 : 1,
              backgroundColor: i === step ? "#15803D" : i < step ? "#6EBE80" : "#E7E5E4",
            }}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn key={step}>
          {/* ── Question ── */}
          <Text className="text-2xl font-bold text-gray-900 leading-snug mb-1">
            {current.question}
          </Text>
          {current.required && (
            <Text className="text-sm font-semibold mb-6" style={{ color: "#B91C1C" }}>Required</Text>
          )}

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <Text className="text-red-700 text-base">{error}</Text>
            </View>
          )}

          <GuidingPrompts prompts={current.guides} />

          {/* ── Voice recording (primary input) ── */}
          {!showTyping && (
            <View className="items-center" style={{ paddingVertical: 32, gap: 16 }}>
              {isTranscribing ? (
                <View className="items-center" style={{ gap: 12 }}>
                  <ActivityIndicator size="large" color="#D97706" />
                  <Text className="text-gray-500 text-base">Transcribing your response...</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={isRecording ? handleStopRecording : handleStartRecording}
                    style={{
                      width: 112, height: 112, borderRadius: 56,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: isRecording ? "#B91C1C" : "#15803D",
                      shadowColor: isRecording ? "#B91C1C" : "#15803D",
                      shadowOpacity: 0.3,
                      shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                      elevation: 6,
                    }}
                  >
                    <Ionicons
                      name={isRecording ? "stop" : "mic"}
                      size={44}
                      color="white"
                    />
                  </TouchableOpacity>
                  <Text className="text-base font-medium" style={{ color: isRecording ? "#B91C1C" : "#78716C" }}>
                    {isRecording ? "Tap to stop recording" : "Tap to start recording"}
                  </Text>
                  {isRecording && liveTranscript !== "" && (
                    <View
                      className="bg-amber-50 rounded-xl w-full"
                      style={{ paddingHorizontal: 16, paddingVertical: 12, marginTop: 4, borderWidth: 1, borderColor: "#FDE68A" }}
                    >
                      <Text className="text-amber-800 text-base">{liveTranscript}</Text>
                    </View>
                  )}
                  {!isRecording && answer.trim() !== "" && (
                    <View
                      className="bg-gray-50 rounded-xl w-full"
                      style={{ paddingHorizontal: 16, paddingVertical: 12, marginTop: 4, borderWidth: 1, borderColor: "#E7E5E4" }}
                    >
                      <Text className="text-gray-700 text-base italic">"{answer}"</Text>
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
                backgroundColor: "#FAFAF9", borderWidth: 1, borderColor: "#E7E5E4",
                borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 17, color: "#1C1917", minHeight: 128, textAlignVertical: "top",
              }}
              placeholder="Type your answer here..."
              placeholderTextColor="#9CA3AF"
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
              <Keyboard size={18} color="#9CA3AF" />
              <Text className="text-gray-500 text-base">Prefer to type instead?</Text>
            </TouchableOpacity>
          )}

          {/* ── Photo (Q2 only) ── */}
          {current.picture && (
            <View style={{ marginTop: 24, gap: 8 }}>
              {photo ? (
                <View>
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ width: "100%", height: 192, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setPhoto(null)}
                    style={{ marginTop: 8, alignItems: "center" }}
                  >
                    <Text className="text-base font-semibold" style={{ color: "#B91C1C" }}>Remove photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text className="text-gray-500 text-sm mb-2">
                    Optional: take a photo of your Kilo
                  </Text>
                  <TouchableOpacity
                    onPress={handleTakePhoto}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 8,
                      borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 16, borderStyle: "dashed",
                      paddingHorizontal: 16, paddingVertical: 12, alignSelf: "flex-start",
                    }}
                  >
                    <Ionicons name="camera-outline" size={20} color="#15803D" />
                    <Text className="text-gray-700 text-base font-semibold">Open Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </FadeIn>
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
            borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 16,
            paddingHorizontal: 20, paddingVertical: 14,
          }}
        >
          <Ionicons name="chevron-back" size={16} color="#78716C" />
          <Text className="text-gray-600 text-base font-semibold">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={isSubmitting}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14,
            backgroundColor: isSubmitting ? "#6EBE80" : "#15803D",
            shadowColor: "#15803D",
            shadowOpacity: 0.2,
            shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text className="text-white text-base font-bold">
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
