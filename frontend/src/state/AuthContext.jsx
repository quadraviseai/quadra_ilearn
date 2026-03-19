import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { apiRequest } from "../lib/api.js";
import { AUTH_SESSION_EVENT, readStoredSession, writeStoredSession } from "../lib/authStorage.js";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [hydrating, setHydrating] = useState(() => Boolean(readStoredSession()?.access));

  const refreshCurrentUser = useCallback(async () => {
    const user = await apiRequest("/api/auth/me");
    setSession((current) => (current ? { ...current, user } : current));
    return user;
  }, []);

  useEffect(() => {
    writeStoredSession(session);
  }, [session]);

  useEffect(() => {
    const handleSessionChange = (event) => {
      setSession(event.detail ?? readStoredSession());
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === "quadrailearn-auth") {
        setSession(readStoredSession());
      }
    };

    window.addEventListener(AUTH_SESSION_EVENT, handleSessionChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, handleSessionChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const validateSession = async ({ silent = false } = {}) => {
      if (!session?.access) {
        setHydrating(false);
        return;
      }

      if (!silent) {
        setHydrating(true);
      }
      try {
        const user = await apiRequest("/api/auth/me");
        if (!cancelled) {
          setSession((current) => (current ? { ...current, user } : current));
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled && !silent) {
          setHydrating(false);
        }
      }
    };

    validateSession();

    const handleFocus = () => {
      validateSession({ silent: true });
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
    };
  }, [session?.access]);

  const login = async (credentials) => {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
    setSession(data);
    return data;
  };

  const authenticateWithGoogle = async (payload) => {
    const data = await apiRequest("/api/auth/google", {
      method: "POST",
      body: payload,
    });
    setSession(data);
    return data;
  };

  const logout = () => {
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        token: session?.access ?? null,
        login,
        authenticateWithGoogle,
        logout,
        refreshCurrentUser,
        isAuthenticated: Boolean(session?.access),
        authReady: !hydrating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
