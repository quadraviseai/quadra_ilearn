import { useEffect, useMemo, useState } from "react";
import { Text, View, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import Screen from "../src/components/Screen";
import { useAuth } from "../src/context/AuthContext";
import { clearPendingAuthRedirect, getPendingAuthRedirect } from "../src/lib/authRedirect";
import {
  clearPendingGoogleAuth,
  DEFAULT_GOOGLE_ANDROID_CLIENT_ID,
  DEFAULT_GOOGLE_IOS_CLIENT_ID,
  getPendingGoogleAuth,
} from "../src/lib/googleAuth";

function routeForRole(role) {
  if (role === "admin") {
    return "/(admin)";
  }
  return "/(student)/diagnostics";
}

export default function OAuthRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { authenticateWithGoogle, logout } = useAuth();
  const [error, setError] = useState("");

  const code = useMemo(() => (typeof params.code === "string" ? params.code : ""), [params.code]);
  const callbackError = useMemo(() => (typeof params.error === "string" ? params.error : ""), [params.error]);

  useEffect(() => {
    let active = true;

    const complete = async () => {
      if (Platform.OS === "web") {
        router.replace("/(auth)/login");
        return;
      }

      if (callbackError) {
        await clearPendingGoogleAuth();
        if (active) {
          setError("Google sign-in was not completed.");
        }
        return;
      }

      if (!code) {
        await clearPendingGoogleAuth();
        if (active) {
          setError("Google did not return an authorization code.");
        }
        return;
      }

      const pending = await getPendingGoogleAuth();
      if (!pending?.codeVerifier || !pending?.redirectUri) {
        await clearPendingGoogleAuth();
        if (active) {
          setError("Google sign-in session expired. Please try again.");
        }
        return;
      }

      try {
        const clientId = Platform.OS === "ios" ? DEFAULT_GOOGLE_IOS_CLIENT_ID : DEFAULT_GOOGLE_ANDROID_CLIENT_ID;
        const body = new URLSearchParams({
          client_id: clientId,
          code,
          code_verifier: pending.codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: pending.redirectUri,
        });

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        const tokenPayload = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenPayload.id_token) {
          throw new Error(tokenPayload.error_description || tokenPayload.error || "Google token exchange failed.");
        }

        const session = await authenticateWithGoogle({
          credential: tokenPayload.id_token,
          intent: pending.intent || "login",
          name: pending.name || "",
          role: "student",
          phone: pending.phone || "",
        });

        const redirectPath = pending.redirectPath || (await getPendingAuthRedirect()) || routeForRole(session.user.role);
        await clearPendingGoogleAuth();
        await clearPendingAuthRedirect();
        router.replace(redirectPath);
      } catch (requestError) {
        await clearPendingGoogleAuth();
        if (active) {
          try {
            await logout();
          } catch {
            // Ignore logout failure after unsuccessful Google auth.
          }
          setError(requestError.message || "Google sign-in failed.");
        }
      }
    };

    complete();
    return () => {
      active = false;
    };
  }, [authenticateWithGoogle, callbackError, code, logout, router]);

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.title}>{error ? "Google Sign-In Failed" : "Completing Google sign-in"}</Text>
        <Text style={styles.copy}>
          {error || "Please wait while we finish signing you in and return you to the app."}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  title: {
    color: "#0F172A",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  copy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
