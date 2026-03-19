import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../lib/api";
import { readSession, writeSession } from "../lib/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const stored = await readSession();
      if (!active) {
        return;
      }

      if (!stored?.access) {
        setSession(null);
        setReady(true);
        return;
      }

      try {
        const user = await apiRequest("/api/auth/me", { token: stored.access });
        const hydrated = { ...stored, user };
        await writeSession(hydrated);
        if (active) {
          setSession(hydrated);
        }
      } catch {
        await writeSession(null);
        if (active) {
          setSession(null);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      token: session?.access ?? null,
      isAuthenticated: Boolean(session?.access),
      ready,
      async login(credentials) {
        const data = await apiRequest("/api/auth/login", {
          method: "POST",
          body: credentials,
        });
        await writeSession(data);
        setSession(data);
        return data;
      },
      async authenticateWithGoogle(payload) {
        const data = await apiRequest("/api/auth/google", {
          method: "POST",
          body: payload,
        });
        await writeSession(data);
        setSession(data);
        return data;
      },
      async logout() {
        await writeSession(null);
        setSession(null);
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
