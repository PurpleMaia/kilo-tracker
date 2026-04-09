import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  accentColor?: string;
  disabled?: boolean;
}

export function AudioRecorder({
  onTranscription,
  accentColor = "#15803D",
  disabled = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const handleStart = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Microphone access is required to record.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

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
      setIsRecording(true);
    } catch {
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const handleStop = async () => {
    setIsRecording(false);
    setIsTranscribing(true);

    if (!recordingRef.current) {
      setIsTranscribing(false);
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        Alert.alert("Error", "No recording found. Try again.");
        setIsTranscribing(false);
        return;
      }

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
        onTranscription(text);
      } else {
        Alert.alert("No text", "Transcription returned no text. Try again.");
      }
    } catch (e) {
      Alert.alert("Error", `Transcription failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  if (isTranscribing) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
        <ActivityIndicator size="small" color={accentColor} />
        <Text style={{ color: accentColor, fontSize: 13, fontWeight: "500" }}>
          Transcribing...
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={isRecording ? handleStop : handleStart}
      disabled={disabled}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: isRecording ? "#FEF2F2" : "#F5F5F4",
        borderWidth: 1,
        borderColor: isRecording ? "#FECACA" : "#E7E5E4",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={isRecording ? "stop-circle" : "mic-outline"}
        size={18}
        color={isRecording ? "#B91C1C" : accentColor}
      />
      <Text
        style={{
          color: isRecording ? "#B91C1C" : accentColor,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {isRecording ? "Stop recording" : "Record voice"}
      </Text>
    </TouchableOpacity>
  );
}
