import * as SecureStore from "expo-secure-store";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://localhost:3000";

const TOKEN_KEY = "session_token";
const TOKEN_TYPE_KEY = "session_token_type";

/** Default request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30_000;

/** Maximum response body size in bytes (10 MB) */
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

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
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Retry once — if it still fails, the token may persist
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_TYPE_KEY);
  } catch {
    await SecureStore.deleteItemAsync(TOKEN_TYPE_KEY).catch(() => {});
  }
}

/** Listener for 401 responses — set by AuthContext to trigger logout */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

/** Sanitize error messages to avoid leaking internal details to the UI */
function sanitizeErrorMessage(raw: string, status: number): string {
  // Block messages that look like they contain internal paths, SQL, or stack traces
  if (/\/[a-z_]+\.(js|ts|sql)|SELECT |INSERT |UPDATE |DELETE |at\s+\w+\s+\(/i.test(raw)) {
    return `Request failed (${status})`;
  }
  return raw;
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

  // Abort on timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle 401 — notify AuthContext to logout
  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Request failed" }));
    const raw = data.error ?? `HTTP ${response.status}`;
    throw new Error(sanitizeErrorMessage(raw, response.status));
  }

  // Guard against oversized responses
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error("Response too large.");
  }

  return response.json() as Promise<T>;
}
