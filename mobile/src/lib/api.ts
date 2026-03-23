import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://localhost:3000";

const TOKEN_KEY = "session_token";
const TOKEN_TYPE_KEY = "session_token_type";

export async function saveToken(token: string, tokenType: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(TOKEN_TYPE_KEY, tokenType);
}

export async function getToken(): Promise<{ token: string; tokenType: string } | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const tokenType = await SecureStore.getItemAsync(TOKEN_TYPE_KEY);
  if (!token || !tokenType) return null;
  return { token, tokenType };
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_TYPE_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await getToken();

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (session) {
    headers["x-session-token"] = session.token;
    headers["x-session-type"] = session.tokenType;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
