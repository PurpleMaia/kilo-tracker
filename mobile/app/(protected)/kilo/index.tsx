import { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { apiFetch } from "@/lib/api";
import { GuidingPrompts } from "@/components/kilo/guiding-prompts";
import { ThemedBackground } from "@/components/kilo/themed-background";
import { StepIndicator } from "@/components/kilo/step-indicator";
import { getTheme } from "@/components/kilo/question-theme";
import { QUESTIONS } from "@kilo/shared/types";

type PhotoData = { uri: string; base64: string; mimeType: string };

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


export default function KiloScreen() {
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [showTyping, setShowTyping] = useState(false);
  const [photo, setPhoto]           = useState<PhotoData | null>(null);
  const [isRecording, setIsRecording]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  useFocusEffect(
    useCallback(() => {
      setStep(0);
      setAnswers({ q1: "", q2: "", q3: "", q4: "" });
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
  const theme   = getTheme(current.id);

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
      ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: false });
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

  // ── Photo ──
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

  // ── Submit ──
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
          q4: answers.q4 || null,
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

  const guideColors = {
    bg: theme.guideBg,
    border: theme.guideBorder,
    text: theme.guideText,
    dot: theme.guideDot,
    accent: theme.accent,
    icon: theme.icon,
  };

  return (
    <ThemedBackground questionId={current.id}>
      <Animated.View entering={FadeIn.duration(600)} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* ── Header ── */}
        <View style={{
          paddingHorizontal: 28,
          paddingTop: 58,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          
        </View>

        {/* ── Step indicator ── */}
        <View style={{ marginBottom: 20 }}>
          <StepIndicator
            totalSteps={QUESTIONS.length}
            currentStep={step}
            questionId={current.id}
          />
          <Text style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: "500",
            color: theme.stepLabel,
            marginTop: 8,
            letterSpacing: 0.5,
          }}>
            {step + 1} of {QUESTIONS.length}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 4,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Content card ── */}
          <Animated.View
            key={step}
            entering={FadeInDown.duration(300)}
            style={{
              backgroundColor: theme.contentBg,
              borderRadius: 24,
              padding: 24,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            {/* Question title */}
            <Text style={{
              fontSize: 22,
              fontWeight: "700",
              color: theme.accentDark,
              lineHeight: 30,
              marginBottom: 4,
              fontFamily: "Newsreader_400Regular",
            }}>
              {current.question}
            </Text>

            {/* {current.required ? (
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#B91C1C", marginBottom: 4 }}>
                Required
              </Text>
            ) : (
              <Text style={{ fontSize: 12, fontWeight: "500", color: theme.stepLabel, marginBottom: 4 }}>
                Optional
              </Text>
            )} */}

            {/* Guiding prompts */}
            <GuidingPrompts prompts={current.guides} colors={guideColors} />

            {/* Error */}
            {error && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={{
                  backgroundColor: "#FEF2F2",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  borderRadius: 14,
                  padding: 14,
                  marginTop: 12,
                }}
              >
                <Text style={{ color: "#B91C1C", fontSize: 14, lineHeight: 20 }}>{error}</Text>
              </Animated.View>
            )}

            {/* ── Voice recording ── */}
            {!showTyping && (
              <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 12, gap: 16 }}>
                {isTranscribing ? (
                  <View style={{ alignItems: "center", gap: 14 }}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={{ color: theme.stepLabel, fontSize: 15 }}>
                      Transcribing your response...
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Mic button with themed ring */}
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                      {isRecording && (
                        <View style={{
                          position: "absolute",
                          width: 126,
                          height: 126,
                          borderRadius: 63,
                          borderWidth: 2,
                          borderColor: "#B91C1C",
                          opacity: 0.3,
                        }} />
                      )}
                      <TouchableOpacity
                        onPress={isRecording ? handleStopRecording : handleStartRecording}
                        activeOpacity={0.8}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 50,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isRecording ? "#B91C1C" : theme.recordBg,
                          shadowColor: isRecording ? "#B91C1C" : theme.accent,
                          shadowOpacity: 0.35,
                          shadowRadius: 16,
                          shadowOffset: { width: 0, height: 6 },
                          elevation: 8,
                        }}
                      >
                        <Ionicons
                          name={isRecording ? "stop" : "mic"}
                          size={40}
                          color="white"
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isRecording ? "#B91C1C" : theme.stepLabel,
                      letterSpacing: 0.2,
                    }}>
                      {isRecording ? "Tap to stop" : "Tap to record"}
                    </Text>

                    {/* Live transcript */}
                    {isRecording && liveTranscript !== "" && (
                      <View style={{
                        backgroundColor: "#FFFBEB",
                        borderRadius: 14,
                        width: "100%",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderWidth: 1,
                        borderColor: "#FDE68A",
                      }}>
                        <Text style={{ color: "#92400E", fontSize: 15, lineHeight: 22 }}>
                          {liveTranscript}
                        </Text>
                      </View>
                    )}

                    {/* Previous answer */}
                    {!isRecording && answer.trim() !== "" && (
                      <View style={{
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        borderRadius: 14,
                        width: "100%",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderWidth: 1,
                        borderColor: theme.inputBorder,
                      }}>
                        <Text style={{
                          color: theme.accentDark,
                          fontSize: 15,
                          lineHeight: 22,
                          fontStyle: "italic",
                          fontFamily: "Newsreader_400Regular_Italic",
                        }}>
                          &ldquo;{answer}&rdquo;
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* ── Text input ── */}
            {showTyping ? (
              <TextInput
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderWidth: 1.5,
                  borderColor: theme.inputBorder,
                  borderRadius: 18,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  fontSize: 16,
                  color: "#1C1917",
                  minHeight: 120,
                  textAlignVertical: "top",
                  marginTop: 16,
                  lineHeight: 24,
                }}
                placeholder="Type your observation here..."
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
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                  paddingVertical: 8,
                }}
              >
                <Keyboard size={16} color={theme.stepLabel} />
                <Text style={{ color: theme.stepLabel, fontSize: 14, fontWeight: "500" }}>
                  Prefer to type instead?
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Photo (picture-enabled questions) ── */}
            {current.picture && (
              <View style={{ marginTop: 20, gap: 10 }}>
                {photo ? (
                  <View>
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ width: "100%", height: 200, borderRadius: 18 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => setPhoto(null)}
                      style={{ marginTop: 10, alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#B91C1C" }}>
                        Remove photo
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleTakePhoto}
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
          </Animated.View>
        </ScrollView>

        {/* ── Bottom navigation ── */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingVertical: 16,
          paddingBottom: Platform.OS === "ios" ? 32 : 16,
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          borderTopWidth: 1,
          borderTopColor: "rgba(0, 0, 0, 0.04)",
        }}>
          <TouchableOpacity
            onPress={goBack}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderWidth: 1.5,
              borderColor: "rgba(0, 0, 0, 0.1)",
              borderRadius: 20,
              paddingHorizontal: 22,
              paddingVertical: 14,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
            }}
          >
            <Ionicons name="chevron-back" size={16} color={theme.stepLabel} />
            <Text style={{ color: theme.stepLabel, fontSize: 15, fontWeight: "600" }}>
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            disabled={isSubmitting}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 20,
              paddingHorizontal: 28,
              paddingVertical: 14,
              backgroundColor: isSubmitting ? theme.progressDone : theme.accent,
              shadowColor: theme.accent,
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }}>
                  {isLast ? "Save Entry" : "Next"}
                </Text>
                {!isLast && <Ionicons name="chevron-forward" size={16} color="white" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </Animated.View>
    </ThemedBackground>
  );
}
