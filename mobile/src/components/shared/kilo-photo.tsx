import { useState, useEffect } from "react";
import { Image } from "react-native";
import { getToken } from "@/lib/api";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function KiloPhoto({ entryId }: { entryId: number }) {
  const [source, setSource] = useState<{ uri: string; headers: Record<string, string> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getToken();
      if (cancelled || !session) return;
      setSource({
        uri: `${BASE_URL}/api/kilo/photo?id=${entryId}`,
        headers: {
          "x-session-token": session.token,
          "x-session-type": session.tokenType,
        },
      });
    })();
    return () => { cancelled = true; };
  }, [entryId]);

  if (!source) return null;
  return (
    <Image
      source={source}
      style={{ width: "100%", height: 160, borderRadius: 12, marginTop: 8 }}
      resizeMode="cover"
    />
  );
}
