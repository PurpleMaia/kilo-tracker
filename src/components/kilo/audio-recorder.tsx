"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ask browser what audio format it supports */
function getSupportedMimeType(): string {
  const types = ["audio/webm", "audio/mp4", "audio/ogg"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

interface AudioRecorderProps {
  onTranscription?: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export function AudioRecorder({ onTranscription, onRecordingStateChange }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sendAudio = async (fileBlob: Blob, mimeType: string) => {
    try {
      setTranscribing(true);
      const formData = new FormData();

      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
      formData.append("file", fileBlob, `audio.${ext}`);

      const resp = await fetch("/api/audio/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Server responded with " + resp.status);

      const data = await resp.json();
      const transcriptText = data.text ?? JSON.stringify(data);
      onTranscription?.(transcriptText);
      setTranscribing(false);
    } catch (e) {
      console.error(e);
      setTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/mp4" });
        await sendAudio(blob, mimeType);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
      onRecordingStateChange?.(true);
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        alert("Microphone permission was denied. Please allow access in your browser settings.");
      } else if (e?.name === "NotFoundError") {
        alert("No microphone found on this device.");
      } else {
        alert("Audio capture is not supported. Try opening this page in Safari 14.3+ and ensure the site is served over HTTPS.");
        console.error(e);
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    onRecordingStateChange?.(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Recording button */}
      <button
        id='audio-recorder-button'
        onClick={recording ? stopRecording : startRecording}
        disabled={transcribing}
        className={cn(
          "cursor-pointer relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-200",
          "focus:outline-none focus:ring-4 focus:ring-offset-2",
          recording
            ? "bg-red-500 hover:bg-red-600 focus:ring-red-300"
            : transcribing
            ? "bg-yellow-500 cursor-not-allowed"
            : "bg-linear-to-br from-green-500 to-lime-800 hover:from-green-600 hover:to-lime-900 focus:ring-lime-300 transition-colors",          
        )}
      >
        {recording ? (
          <Square className="h-8 w-8 text-white fill-white" />
        ) : transcribing ? (
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <Mic className="h-8 w-8 text-white" />
        )}

        {/* Pulse ring when recording */}
        {recording && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />
        )}
      </button>

      {/* Status text */}
      <p className="text-sm text-muted-foreground">
        {recording
          ? "Recording... Tap to stop"
          : transcribing
          ? "Transcribing your audio..."
          : "Tap to start recording"}
      </p>
    </div>
  );
}