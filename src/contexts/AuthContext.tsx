import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, saveToken, clearToken, getToken, setOnUnauthorized } from "@/lib/api";
import { AuthUser } from "@/types";
import { fetchProfile, isMobileProfileComplete, MobileUserProfile } from "@/lib/profile";

interface AuthContextValue {
  user: AuthUser | null;
  profile: MobileUserProfile;
  profileComplete: boolean;
  profileHasUnsavedChanges: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfileHasUnsavedChanges: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<MobileUserProfile>(null);
  const [profileHasUnsavedChanges, setProfileHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const nextProfile = await fetchProfile();
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getToken();
      if (!session) {
        setUser(null);
        setProfile(null);
        return;
      }
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/session");
      setUser(data.user);
      await refreshProfile();
    } catch {
      setUser(null);
      setProfile(null);
      await clearToken();
    }
  }, [refreshProfile]);

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
    // Profile fetch is best-effort during login — don't let it kill the session
    try {
      await refreshProfile();
    } catch {
      // Profile will be fetched again when protected layout renders
    }
  }, [refreshProfile]);

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
    setProfile(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — clear local state regardless
    }
    await clearToken();
    setUser(null);
    setProfile(null);
  }, []);

  // Register 401 handler so apiFetch can trigger logout on expired sessions
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    setOnUnauthorized(() => {
      logoutRef.current();
    });
    return () => setOnUnauthorized(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profileComplete: isMobileProfileComplete(profile),
        profileHasUnsavedChanges,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshSession,
        refreshProfile,
        setProfileHasUnsavedChanges,
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
