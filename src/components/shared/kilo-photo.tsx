import { useState, useEffect } from "react";
import { Image } from "react-native";
import { getToken, BASE_URL } from "@/lib/api";

export function KiloPhoto({ entryId, question = "q1" }: { entryId: number; question?: string }) {
  const [source, setSource] = useState<{ uri: string; headers: Record<string, string> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getToken();
      if (cancelled || !session) return;
      setSource({
        uri: `${BASE_URL}/api/kilo/photo?id=${entryId}&question=${question}`,
        headers: {
          "x-session-token": session.token,
          "x-session-type": session.tokenType,
        },
      });
    })();
    return () => { cancelled = true; };
  }, [entryId, question]);

  if (!source) return null;
  return (
    <Image
      source={source}
      style={{ width: "100%", height: 160, borderRadius: 12, marginTop: 8 }}
      resizeMode="cover"
    />
  );
}
