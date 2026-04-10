import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Linking,
  Keyboard as RNKeyboard,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Audio } from "expo-av";
import * as Network from "expo-network";
import * as ImagePicker from "expo-image-picker";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard } from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { GuidingPrompts } from "@/components/kilo/guiding-prompts";
import { ThemedBackground } from "@/components/kilo/themed-background";
import { StepIndicator } from "@/components/kilo/step-indicator";
import { getTheme } from "@/components/kilo/question-theme";
import { QUESTIONS } from "@/shared/types";

type PhotoData = { uri: string; mimeType: string };
type PhotoQuestion = "q1" | "q2" | "q3";
type VoicePermissionState = {
  checked: boolean;
  microphoneGranted: boolean;
  speechGranted: boolean;
  microphoneCanAskAgain: boolean;
  speechCanAskAgain: boolean;
};

export default function KiloScreen() {
  const { profileComplete, refreshProfile } = useAuth();

  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [showTyping, setShowTyping] = useState(false);
  const [photos, setPhotos]         = useState<Record<PhotoQuestion, PhotoData | null>>({ q1: null, q2: null, q3: null });
  const [isRecording, setIsRecording]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [focusKey, setFocusKey] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [transcribeMode, setTranscribeMode] = useState<"whisper" | "device" | null>(null);
  const [voicePermissions, setVoicePermissions] = useState<VoicePermissionState>({
    checked: false,
    microphoneGranted: false,
    speechGranted: false,
    microphoneCanAskAgain: true,
    speechCanAskAgain: true,
  });

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    if (!profileComplete) {
      router.replace("/(protected)/onboarding");
    }
  }, [profileComplete]);

  const syncVoicePermissions = useCallback(async () => {
    try {
      const [microphone, speech] = await Promise.all([
        Audio.getPermissionsAsync(),
        ExpoSpeechRecognitionModule.getPermissionsAsync(),
      ]);

      setVoicePermissions({
        checked: true,
        microphoneGranted: microphone.granted,
        speechGranted: speech.granted,
        microphoneCanAskAgain: microphone.canAskAgain,
        speechCanAskAgain: speech.canAskAgain,
      });
    } catch {
      setVoicePermissions({
        checked: true,
        microphoneGranted: false,
        speechGranted: false,
        microphoneCanAskAgain: false,
        speechCanAskAgain: false,
      });
    }
  }, []);

  // expo-av recording ref (for Whisper path)
  const recordingRef = useRef<Audio.Recording | null>(null);
  // On-device fallback transcript accumulated during recording
  const deviceTranscriptRef = useRef("");

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = RNKeyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const subHide = RNKeyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { subShow.remove(); subHide.remove(); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStep(0);
      setAnswers({ q1: "", q2: "", q3: "", q4: "" });
      setShowTyping(false);
      setPhotos({ q1: null, q2: null, q3: null });
      setIsRecording(false);
      setIsTranscribing(false);
      setIsSubmitting(false);
      setError(null);
      setLiveTranscript("");
      setFocusKey((k) => k + 1);
      deviceTranscriptRef.current = "";
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      syncVoicePermissions();
    }, [syncVoicePermissions])
  );

  const current = QUESTIONS[step];
  const answer  = answers[current.id as keyof typeof answers];
  const isLast  = step === QUESTIONS.length - 1;
  const theme   = getTheme(current.id);
  const hasVoicePermissions = voicePermissions.microphoneGranted && voicePermissions.speechGranted;
  const canRequestVoicePermissions =
    voicePermissions.microphoneCanAskAgain || voicePermissions.speechCanAskAgain;

  const setAnswer = (val: string) =>
    setAnswers((a) => ({ ...a, [current.id]: val }));

  const goBack = () => {
    setError(null);
    setShowTyping(false);
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  // ── On-device speech recognition (runs alongside expo-av for live preview + offline fallback) ──
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript ?? "";
    if (event.isFinal) {
      deviceTranscriptRef.current += (deviceTranscriptRef.current ? " " : "") + transcript;
      setLiveTranscript(deviceTranscriptRef.current);
    } else {
      // Show accumulated + current interim
      setLiveTranscript(
        deviceTranscriptRef.current + (deviceTranscriptRef.current ? " " : "") + transcript
      );
    }
  });

  useSpeechRecognitionEvent("end", () => {
    // On-device recognition may auto-stop on silence with continuous mode;
    // restart it if we're still recording audio
    if (recordingRef.current) {
      try {
        ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: true });
      } catch {
        // Ignore — recording may have just stopped
      }
    }
  });

  useSpeechRecognitionEvent("error", () => {
    // On-device error is non-fatal — we still have the audio file for Whisper
  });

  const ensureVoicePermissions = useCallback(async () => {
    const [microphoneCurrent, speechCurrent] = await Promise.all([
      Audio.getPermissionsAsync(),
      ExpoSpeechRecognitionModule.getPermissionsAsync(),
    ]);

    const microphone = microphoneCurrent.granted
      ? microphoneCurrent
      : await Audio.requestPermissionsAsync();
    const speech = speechCurrent.granted
      ? speechCurrent
      : await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    setVoicePermissions({
      checked: true,
      microphoneGranted: microphone.granted,
      speechGranted: speech.granted,
      microphoneCanAskAgain: microphone.canAskAgain,
      speechCanAskAgain: speech.canAskAgain,
    });

    const granted = microphone.granted && speech.granted;
    if (!granted) {
      setError("Microphone and speech recognition must both be enabled before recording.");
    }

    return granted;
  }, []);

  const handleResolveVoicePermissions = useCallback(async () => {
    try {
      if (canRequestVoicePermissions) {
        await ensureVoicePermissions();
        return;
      }

      await Linking.openSettings();
    } catch {
      setError("Unable to open Settings. Please enable microphone and speech recognition access manually.");
    }
  }, [canRequestVoicePermissions, ensureVoicePermissions]);

  // ── Start recording ──
  const handleStartRecording = async () => {
    try {
      const permissionsGranted = await ensureVoicePermissions();
      if (!permissionsGranted) {
        return;
      }

      // Check network to show mode indicator
      const networkState = await Network.getNetworkStateAsync();
      const isOnline = networkState.isConnected && networkState.isInternetReachable;
      setTranscribeMode(isOnline ? "whisper" : "device");

      // Configure audio session for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start expo-av recording (records until user stops — no auto-cutoff)
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: ".wav",
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });
      recordingRef.current = recording;

      // Start on-device speech recognition in parallel for live preview
      try {
        const speechResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (speechResult.granted) {
          ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: true });
        }
      } catch {
        // On-device not available — that's fine, we still have the audio recording
      }

      deviceTranscriptRef.current = "";
      setLiveTranscript("");
      setIsRecording(true);
      setError(null);
    } catch {
      setError("Failed to start recording.");
    }
  };

  // ── Stop recording ──
  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsTranscribing(true);

    // Stop on-device speech recognition
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignore
    }

    // Stop expo-av recording and get the audio file
    if (!recordingRef.current) {
      setIsTranscribing(false);
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        // No audio file — use on-device transcript if available
        if (deviceTranscriptRef.current.trim()) {
          setAnswer((answer ? answer + " " : "") + deviceTranscriptRef.current.trim());
          setShowTyping(true);
        } else {
          setError("No recording found. Try again or type your answer.");
          setShowTyping(true);
        }
        setIsTranscribing(false);
        return;
      }

      // Check network at time of stop
      const networkState = await Network.getNetworkStateAsync();
      // const isOnline = networkState.isConnected && networkState.isInternetReachable;
      const isOnline = false; // Force offline for beta-testing

      if (isOnline) {
        // ── Online: send to Whisper API ──
        setTranscribeMode("whisper");
        try {
          const formData = new FormData();
          formData.append("file", {
            uri,
            name: "audio.wav",
            type: "audio/wav",
          } as never);

          const { text } = await apiFetch<{ text: string }>("/api/audio/transcribe", {
            method: "POST",
            body: formData,
          });

          if (text) {
            setAnswer((answer ? answer + " " : "") + text);
            setShowTyping(true);
          } else {
            // Whisper returned empty — fall back to on-device
            if (deviceTranscriptRef.current.trim()) {
              setAnswer((answer ? answer + " " : "") + deviceTranscriptRef.current.trim());
              setShowTyping(true);
            } else {
              setError("Transcription returned no text. Try again or type your answer.");
              setShowTyping(true);
            }
          }
        } catch (e) {
          // Whisper API failed — fall back to on-device
          if (deviceTranscriptRef.current.trim()) {
            setAnswer((answer ? answer + " " : "") + deviceTranscriptRef.current.trim());
            setShowTyping(true);
          } else {
            setError("Transcription failed. Try again or type your answer.");
            setShowTyping(true);
          }
        }
      } else {
        // ── Offline: use on-device transcript ──
        setTranscribeMode("device");
        if (deviceTranscriptRef.current.trim()) {
          setAnswer((answer ? answer + " " : "") + deviceTranscriptRef.current.trim());
          setShowTyping(true);
        } else {
          setError("No network and on-device transcription captured nothing. Try typing instead.");
          setShowTyping(true);
        }
      }
    } catch (e) {
      setError("Recording failed. Please try again.");
      setShowTyping(true);
      recordingRef.current = null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const currentPhotoQ = current.id as PhotoQuestion;
  const currentPhoto = (["q1", "q2", "q3"] as PhotoQuestion[]).includes(currentPhotoQ) ? photos[currentPhotoQ] : null;

  // ── Photo ──
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images", quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const q = currentPhotoQ;
      setPhotos((prev) => ({ ...prev, [q]: { uri: a.uri, mimeType: a.mimeType ?? "image/jpeg" } }));
    }
  };

  // ── Submit (create) ──
  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("q1", answers.q1);
      if (answers.q2) formData.append("q2", answers.q2);
      if (answers.q3) formData.append("q3", answers.q3);
      if (answers.q4) formData.append("q4", answers.q4);

      for (const q of ["q1", "q2", "q3"] as PhotoQuestion[]) {
        if (photos[q]) {
          formData.append(`${q}_photo`, {
            uri: photos[q]!.uri,
            name: `${q}_photo.jpg`,
            type: photos[q]!.mimeType,
          } as never);
        }
      }

      await apiFetch("/api/kilo", {
        method: "POST",
        body: formData,
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* ── Step indicator ── */}
        <Animated.View key={`step-${focusKey}-${step}`} entering={FadeInDown.duration(400).delay(100)} style={{ paddingTop: 62, marginBottom: 8 }}>
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
        </Animated.View>

        <View style={{ flex: 1, position: "relative" }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Content card ── */}
          <Animated.View
            key={`card-${focusKey}-${step}`}
            entering={FadeInDown.duration(400).delay(200)}
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
                ) : voicePermissions.checked && !hasVoicePermissions ? (
                  <View
                    style={{
                      width: "100%",
                      gap: 14,
                      backgroundColor: "#FFF7ED",
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: "#FDBA74",
                      padding: 18,
                    }}
                  >
                    <View style={{ gap: 6 }}>
                      <Text
                        style={{
                          color: "#9A3412",
                          fontSize: 16,
                          fontWeight: "700",
                        }}
                      >
                        Enable voice permissions
                      </Text>
                      <Text style={{ color: "#9A3412", fontSize: 14, lineHeight: 20 }}>
                        KILO needs both microphone and speech recognition access before it can start recording.
                      </Text>
                      <Text style={{ color: "#9A3412", fontSize: 13, lineHeight: 18 }}>
                        If either permission was denied earlier, enable both in Settings and return here.
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={handleResolveVoicePermissions}
                      activeOpacity={0.8}
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 14,
                        paddingVertical: 14,
                        backgroundColor: theme.recordBg,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
                        {canRequestVoicePermissions ? "Enable voice access" : "Open Settings"}
                      </Text>
                    </TouchableOpacity>
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
              <>
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

                {/* Inline toolbar — visible when keyboard is dismissed */}
                {!keyboardVisible && (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 14,
                  }}>
                    <TouchableOpacity
                      onPress={() => setShowTyping(false)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 16,
                        backgroundColor: theme.guideBg,
                        borderWidth: 1,
                        borderColor: theme.guideBorder,
                      }}
                    >
                      <Ionicons name="mic-outline" size={18} color={theme.accent} />
                      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "600" }}>
                        Voice
                      </Text>
                    </TouchableOpacity>                   
                  </View>
                )}
              </>
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
                {currentPhoto ? (
                  <View>
                    <Image
                      source={{ uri: currentPhoto.uri }}
                      style={{ width: "100%", height: 200, borderRadius: 18 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => setPhotos((prev) => ({ ...prev, [currentPhotoQ]: null }))}
                      style={{ marginTop: 10, alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#B91C1C" }}>
                        Remove photo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleTakePhoto}
                      style={{ marginTop: 6, alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "500", color: theme.stepLabel }}>
                        Retake photo
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

          {/* ── Top fade: theme color → transparent ── */}
          <LinearGradient
            colors={[theme.gradientStart, theme.gradientStart + "00"]}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 32,
            }}
          />

          {/* ── Bottom fade: transparent → theme color ── */}
          <LinearGradient
            colors={[theme.gradientStart + "00", theme.gradientStart]}
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
            }}
          />
        </View>

        {/* ── Bottom navigation ── */}
        {!keyboardVisible && (
        <Animated.View key={`nav-${focusKey}-${step}`} entering={FadeInUp.duration(400).delay(350)} style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingVertical: 16,
          paddingBottom: Platform.OS === "ios" ? 32 : 16,
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
        </Animated.View>
        )}
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}
