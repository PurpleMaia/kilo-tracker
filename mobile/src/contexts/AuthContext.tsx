import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, saveToken, clearToken, getToken } from "@/lib/api";
import { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getToken();
      if (!session) {
        setUser(null);
        return;
      }
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/session");
      setUser(data.user);
    } catch {
      setUser(null);
      await clearToken();
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser; token: string; tokenType: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ credentials: { identifier, password } }),
      }
    );
    await saveToken(data.token, data.tokenType);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser; token: string; tokenType: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, username, password }),
      }
    );
    await saveToken(data.token, data.tokenType);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — clear local state regardless
    }
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
