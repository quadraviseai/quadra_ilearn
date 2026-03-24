import { useEffect, useMemo, useState } from "react";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { clearPendingAuthRedirect, getPendingAuthRedirect, setPendingAuthRedirect } from "../../src/lib/authRedirect";
import {
  buildNativeGoogleRedirect,
  clearPendingGoogleAuth,
  DEFAULT_GOOGLE_ANDROID_CLIENT_ID,
  DEFAULT_GOOGLE_IOS_CLIENT_ID,
  DEFAULT_GOOGLE_WEB_CLIENT_ID,
  setPendingGoogleAuth,
} from "../../src/lib/googleAuth";
import { colors, radii, shadows, spacing } from "../../src/theme";

WebBrowser.maybeCompleteAuthSession();

function routeForRole(role) {
  if (role === "admin") {
    return "/(admin)";
  }
  return "/(student)/diagnostics";
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login, authenticateWithGoogle, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
  const nonce = useMemo(() => `${Date.now()}-quadrailearn-mobile`, []);
  const [googleRequest, googleResponse, promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId: googleClientId,
      androidClientId: googleAndroidClientId,
      iosClientId: googleIosClientId,
      redirectUri: Platform.OS === "web" ? undefined : googleRedirectUri,
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
      nonce,
    },
  );
  const redirectPath = typeof params.redirect === "string" && params.redirect ? params.redirect : "";
  const preferredMode = typeof params.mode === "string" ? params.mode : "";
  const shouldAutoLaunchGoogle = preferredMode === "google";

  useEffect(() => {
    if (!redirectPath) {
      return;
    }
    void setPendingAuthRedirect(redirectPath);
  }, [redirectPath]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const session = await login({ email, password });
      if (session.user.role === "guardian") {
        await logout();
        setError("Guardian accounts are not supported in this mobile app.");
        return;
      }
      const nextPath = redirectPath || (await getPendingAuthRedirect()) || routeForRole(session.user.role);
      await clearPendingAuthRedirect();
      router.replace(nextPath);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

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
        const nextPath = redirectPath || (await getPendingAuthRedirect()) || routeForRole(session.user.role);
        await clearPendingGoogleAuth();
        await clearPendingAuthRedirect();
        router.replace(nextPath);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setGoogleLoading(false);
      }
    };

    completeGoogleLogin();
  }, [authenticateWithGoogle, googleResponse, logout, redirectPath, router]);

  const handleGoogleLogin = async () => {
    if (!googleRequest) {
      return;
    }

    setError("");
    setGoogleLoading(true);
    if (Platform.OS !== "web") {
      await setPendingGoogleAuth({
        intent: "login",
        redirectPath,
        codeVerifier: googleRequest.codeVerifier || "",
        redirectUri: googleRedirectUri,
      });
    }
    await promptAsync();
  };

  useEffect(() => {
    if (!shouldAutoLaunchGoogle || !googleRequest || googleLoading) {
      return;
    }
    handleGoogleLogin();
  }, [googleLoading, googleRequest, shouldAutoLaunchGoogle]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen backgroundColor="#F5F7FA">
      <View style={styles.pageShell}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <LinearGradient colors={["#f7fbff", "#eef4fb", "#f8f3eb"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.backgroundGradient} />
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowAccent} />
          <View style={styles.heroGlowSoft} />
        </View>

        <View style={styles.heroShell}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Image source={require("../../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.logoWordmark}>QuadraILearn</Text>
                <Text style={styles.brandSubtext}>Student learning and assessment platform</Text>
              </View>
            </View>
            <Link href="/landing" style={styles.skipLink}>
              Back
            </Link>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.stepLabel}>Login</Text>
            <Text style={styles.title}>Welcome back to QuadraILearn</Text>
            <Text style={styles.heroCopy}>Sign in to continue your practice, track progress, and unlock your full performance insights.</Text>
          </View>

          <View style={styles.formPanel}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.slateSoft}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.slateSoft}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.button, loading ? styles.buttonDisabled : null]} onPress={handleLogin} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign in"}</Text>
            </Pressable>

            <Text style={styles.socialLabel}>Or continue with Google</Text>

            <View style={styles.socialRow}>
              <Pressable
                style={[styles.googleOnlyButton, (googleLoading || loading) ? styles.buttonDisabled : null]}
                onPress={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                <Text style={styles.googleGlyph}>G</Text>
                <Text style={styles.googleOnlyText}>{googleLoading ? "Opening Google..." : "Sign in with Google"}</Text>
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href={redirectPath ? { pathname: "/(auth)/register", params: { redirect: redirectPath } } : "/(auth)/register"} style={styles.link}>
                Sign up
              </Link>
            </View>

            <View style={styles.inlineLinks}>
              <Link href="/(auth)/forgot-password" style={styles.inlineLink}>
                Forgot password?
              </Link>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageShell: {
    minHeight: 720,
    paddingTop: 8,
    paddingBottom: spacing.xl,
    paddingHorizontal: 10,
    position: "relative",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGlowPrimary: {
    position: "absolute",
    top: -40,
    right: -10,
    width: 260,
    height: 260,
    borderRadius: radii.pill,
    backgroundColor: "rgba(20, 87, 154, 0.10)",
  },
  heroGlowAccent: {
    position: "absolute",
    left: -40,
    top: 220,
    width: 190,
    height: 190,
    borderRadius: radii.pill,
    backgroundColor: "rgba(251, 100, 4, 0.08)",
  },
  heroGlowSoft: {
    position: "absolute",
    right: -50,
    bottom: 120,
    width: 160,
    height: 160,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  heroShell: {
    flex: 1,
    maxWidth: 390,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 6,
    paddingTop: 8,
    gap: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  logoWordmark: {
    color: "#1D4E89",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  brandSubtext: {
    color: "#627D98",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 180,
  },
  skipLink: {
    color: "#486581",
    fontSize: 13,
    fontWeight: "600",
    paddingTop: 10,
  },
  headerBlock: {
    gap: 10,
    maxWidth: "78%",
    paddingTop: 8,
  },
  stepLabel: {
    color: "#1D4E89",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    color: "#102A43",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "left",
  },
  heroCopy: {
    color: "#52606D",
    fontSize: 14,
    lineHeight: 22,
  },
  formPanel: {
    marginTop: "auto",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...shadows.card,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#243B53",
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    fontSize: 13,
  },
  socialLabel: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  socialRow: {
    alignItems: "center",
  },
  googleOnlyButton: {
    minWidth: 220,
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#ffffff",
  },
  googleGlyph: {
    color: "#ea4335",
    fontWeight: "900",
    fontSize: 18,
  },
  googleOnlyText: {
    color: "#1D4E89",
    fontWeight: "700",
    fontSize: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  inlineLinks: {
    alignItems: "center",
    marginTop: -2,
  },
  inlineLink: {
    color: "#1D4E89",
    fontWeight: "700",
    fontSize: 12,
  },
  link: {
    color: "#1D4E89",
    fontWeight: "700",
    fontSize: 12,
  },
});
