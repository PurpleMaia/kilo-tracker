"use client";

import { useState, useRef } from "react";

/** Ask browser what audio format it supports */
function getSupportedMimeType(): string {
  const types = ["audio/webm", "audio/mp4", "audio/ogg"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function AudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sendAudio = async (fileBlob: Blob, mimeType: string) => {
    try {
      setTranscribing(true);
      const formData = new FormData();

      // Ensure the file has the correct extension based on its MIME type
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
      formData.append('file', fileBlob, `audio.${ext}`);

      console.log("Sending audio blob to server:", fileBlob);
      console.log("FormData contents:", formData);
      
      const resp = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) throw new Error('Server responded with ' + resp.status);

      const data = await resp.json();
      setTranscript(data.text ?? JSON.stringify(data));
      setTranscribing(false);
    } catch (e) {
      console.error(e);
      setTranscript('Error processing audio');
      setTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone access and start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      // Store references to the recorder and audio chunks
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
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        alert("Microphone permission was denied. Please allow access in your browser settings.");
      } else if (e?.name === "NotFoundError") {
        alert("No microphone found on this device.");
      } else {
        // Last resort fallback for browsers that truly can't do getUserMedia
        alert("Audio capture is not supported. Try opening this page in Safari 14.3+ and ensure the site is served over HTTPS.");
        console.error(e);
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {recording ? (
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={stopRecording}
        >
          Stop Recording
        </button>
      ) : transcribing ? (
        <button
          className="px-4 py-2 bg-yellow-500 text-white rounded"
          disabled
        >
          Transcribing...
        </button>
      ) : (
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={startRecording}
        >
          Start Recording
        </button>
      )}
      {transcript && (
        <div className="max-w-md w-full p-4 border rounded bg-gray-50">
          <h3 className="font-medium mb-2">Transcription:</h3>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}