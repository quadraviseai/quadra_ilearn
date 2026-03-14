import { createContext, useContext, useEffect, useState } from "react";

import { apiRequest } from "../lib/api.js";
import { readStoredSession, writeStoredSession } from "../lib/authStorage.js";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());

  useEffect(() => {
    writeStoredSession(session);
  }, [session]);

  const login = async (credentials) => {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: credentials,
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
        logout,
        isAuthenticated: Boolean(session?.access),
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
