"use client";

import { useState, useRef, useEffect } from "react";

export default function AudioPlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);

  // Cleanup object URL on component unmount
  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, []);

  const playSpeech = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/audio/speak", { method: "POST" });
      if (!resp.ok) {
        throw new Error(`Server responded with ${resp.status}`);
      }
      const blob = await resp.blob();
      const newUrl = URL.createObjectURL(blob);
      // Revoke previous object URL if it exists to avoid memory leaks
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = newUrl;
      if (audioRef.current) {
        audioRef.current.src = newUrl;
        await audioRef.current.play();
      }
    } catch (e: any) {
      console.error("Error fetching speech audio:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={playSpeech}
        disabled={loading}
      >
        {loading ? "Loading..." : "Play Speech"}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      <audio ref={audioRef} />
    </div>
  );
}
