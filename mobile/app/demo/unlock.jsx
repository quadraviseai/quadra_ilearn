import { useEffect, useMemo, useState } from "react";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { clearPendingAuthRedirect, setPendingAuthRedirect } from "../../src/lib/authRedirect";
import { buildDemoResult } from "../../src/lib/demoTest";
import {
  buildNativeGoogleRedirect,
  clearPendingGoogleAuth,
  DEFAULT_GOOGLE_ANDROID_CLIENT_ID,
  DEFAULT_GOOGLE_IOS_CLIENT_ID,
  DEFAULT_GOOGLE_WEB_CLIENT_ID,
  setPendingGoogleAuth,
} from "../../src/lib/googleAuth";

const redirectTarget = "/demo/full-report";

WebBrowser.maybeCompleteAuthSession();

export default function DemoUnlockScreen() {
  const router = useRouter();
  const { authenticateWithGoogle, logout } = useAuth();
  const result = buildDemoResult();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_GOOGLE_WEB_CLIENT_ID;
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || DEFAULT_GOOGLE_ANDROID_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || DEFAULT_GOOGLE_IOS_CLIENT_ID;
  const googleRedirectUri = useMemo(
    () =>
      makeRedirectUri({
        native: Platform.select({
          android: buildNativeGoogleRedirect(googleAndroidClientId),
          ios: buildNativeGoogleRedirect(googleIosClientId),
        }),
      }),
    [googleAndroidClientId, googleIosClientId],
  );
  const nonce = useMemo(() => `${Date.now()}-quadrailearn-demo-unlock`, []);
  const [googleRequest, googleResponse, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
    redirectUri: Platform.OS === "web" ? undefined : googleRedirectUri,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    nonce,
  });

  useEffect(() => {
    void setPendingAuthRedirect(redirectTarget);
  }, []);

  useEffect(() => {
    const completeGoogleLogin = async () => {
      if (!googleResponse) {
        return;
      }

      if (googleResponse.type !== "success") {
        if (googleResponse.type !== "dismiss" && googleResponse.type !== "cancel") {
          setError("Google sign-in was not completed.");
        }
        setGoogleLoading(false);
        return;
      }

      const credential = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (!credential) {
        setError("Google did not return an ID token.");
        setGoogleLoading(false);
        return;
      }

      try {
        const session = await authenticateWithGoogle({
          credential,
          intent: "login",
        });
        if (session.user.role === "guardian") {
          await logout();
          setError("Guardian accounts are not supported in this mobile app.");
          return;
        }
        await clearPendingGoogleAuth();
        await clearPendingAuthRedirect();
        router.replace(redirectTarget);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setGoogleLoading(false);
      }
    };

    void completeGoogleLogin();
  }, [authenticateWithGoogle, googleResponse, logout, router]);

  const handleGoogleLogin = async () => {
    if (!googleRequest || googleLoading) {
      return;
    }

    setError("");
    setGoogleLoading(true);
    if (Platform.OS !== "web") {
      await setPendingGoogleAuth({
        intent: "login",
        redirectPath: redirectTarget,
        codeVerifier: googleRequest.codeVerifier || "",
        redirectUri: googleRedirectUri,
      });
    }
    await promptAsync();
  };

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <Image source={require("../../assets/quadravise-logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brandText}>QuadraILearn</Text>
        </View>

        <View style={styles.content}>
          {result ? (
            <View style={styles.resultReminder}>
              <Text style={styles.resultScore}>Your Score: {result.correct} / {result.totalQuestions}</Text>
              <Text style={styles.resultRank}>You beat {result.betterThan}% of students 🔥</Text>
            </View>
          ) : null}

          <Text style={styles.stepText}>Step 1 of 2</Text>

          <View style={styles.headlineBlock}>
            <Text style={styles.title}>Unlock Your Full Report 🔓</Text>
            <Text style={styles.copy}>Save your result and see your exact rank and weak areas.</Text>
          </View>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>✔</Text>
              <Text style={styles.bulletText}>Your exact rank</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>✔</Text>
              <Text style={styles.bulletText}>Weak topics analysis</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>✔</Text>
              <Text style={styles.bulletText}>AI explanations</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>✔</Text>
              <Text style={styles.bulletText}>Personalized improvement plan</Text>
            </View>
          </View>

          <View style={styles.ctaGroup}>
            <Pressable
              style={[styles.primaryButton, googleLoading ? styles.primaryButtonDisabled : null]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            >
              <Ionicons name="logo-google" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{googleLoading ? "Opening Google..." : "Continue with Google"}</Text>
            </Pressable>

            <Link href={{ pathname: "/(auth)/register", params: { redirect: redirectTarget } }} asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Continue with Email</Text>
              </Pressable>
            </Link>

            <Link href={{ pathname: "/(auth)/login", params: { redirect: redirectTarget } }} asChild>
              <Pressable style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Login</Text>
              </Pressable>
            </Link>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.trustText}>Takes less than 10 seconds</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    gap: 18,
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
    marginBottom: 16,
  },
  logoWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
  },
  brandText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  resultReminder: {
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
  },
  resultScore: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  resultRank: {
    color: "#1D4E89",
    fontSize: 14,
    fontWeight: "600",
  },
  stepText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headlineBlock: {
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
  },
  copy: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletIcon: {
    color: "#1D4E89",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  bulletText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  ctaGroup: {
    gap: 16,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1D4E89",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  trustText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
