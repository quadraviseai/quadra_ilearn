import { useEffect, useMemo, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { colors, gradients, radii, shadows, spacing } from "../../src/theme";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_GOOGLE_WEB_CLIENT_ID = "52499757157-mr3kcemi7o13gilv87oqvrr0p8p9jvkv.apps.googleusercontent.com";
const DEFAULT_GOOGLE_ANDROID_CLIENT_ID = "52499757157-6724lll0jek5os124d8jctg11kfjhrck.apps.googleusercontent.com";
const DEFAULT_GOOGLE_IOS_CLIENT_ID = "52499757157-mr3kcemi7o13gilv87oqvrr0p8p9jvkv.apps.googleusercontent.com";

function routeForRole(role) {
  if (role === "admin") {
    return "/(admin)";
  }
  return "/(student)/diagnostics";
}

export default function LoginScreen() {
  const router = useRouter();
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
  const nonce = useMemo(() => `${Date.now()}-quadrailearn-mobile`, []);
  const [googleRequest, googleResponse, promptAsync] = Google.useIdTokenAuthRequest(
    {
      expoClientId: googleClientId,
      webClientId: googleClientId,
      androidClientId: googleAndroidClientId,
      iosClientId: googleIosClientId,
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
      nonce,
    },
  );

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
      router.replace(routeForRole(session.user.role));
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

      const credential = googleResponse.params?.id_token;
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
        router.replace(routeForRole(session.user.role));
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setGoogleLoading(false);
      }
    };

    completeGoogleLogin();
  }, [authenticateWithGoogle, googleResponse, logout, router]);

  const handleGoogleLogin = async () => {
    if (!googleRequest) {
      setError("Google sign-in is not ready yet.");
      return;
    }

    setError("");
    setGoogleLoading(true);
    await promptAsync();
  };

  return (
    <Screen>
      <LinearGradient colors={gradients.authHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroMarkRow}>
          <View style={styles.heroMark}>
            <Image source={require("../../assets/quadravise-logo.png")} style={styles.heroMarkImage} resizeMode="contain" />
          </View>
          <View style={styles.heroMarkCopy}>
            <Text style={styles.eyebrow}>QuadraILearn Mobile</Text>
            <Text style={styles.heroKicker}>Live student learning workspace</Text>
          </View>
        </View>
        <Text style={styles.title}>Modern learning insight for every exam that matters.</Text>
        <Text style={styles.copy}>
          Sign in to exams, reports, weak-topic learning, and profile tools with the same account used on the web app.
        </Text>
        <View style={styles.heroStatRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>Exam-ready</Text>
            <Text style={styles.heroStatLabel}>JEE, NEET, school boards</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>Live sync</Text>
            <Text style={styles.heroStatLabel}>Mobile and web stay aligned</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Welcome back</Text>
        <Text style={styles.sectionCopy}>Use email/password or Google to continue into your dashboard.</Text>
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
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <Pressable
          style={[styles.googleButton, (googleLoading || loading) ? styles.buttonDisabled : null]}
          onPress={handleGoogleLogin}
          disabled={googleLoading || loading}
        >
          <Text style={styles.googleButtonMark}>G</Text>
          <Text style={styles.googleButtonText}>{googleLoading ? "Opening Google..." : "Continue with Google"}</Text>
        </Pressable>
        <Text style={styles.footnote}>
          <Link href="/(auth)/forgot-password" style={styles.link}>Forgot password?</Link>
        </Text>
        <Text style={styles.footnote}>
          New here? <Link href="/(auth)/register" style={styles.link}>Create account</Link>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassChip,
    ...shadows.card,
  },
  heroMarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroMark: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.glow,
  },
  heroMarkImage: {
    width: 36,
    height: 36,
  },
  heroMarkCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.brandBlue,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroKicker: {
    color: colors.inkSoft,
    marginTop: 4,
    fontWeight: "700",
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
  },
  copy: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 22,
  },
  heroStatRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroStat: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.glassTextMuted,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 4,
  },
  heroStatValue: {
    color: colors.ink,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.glassStrong,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassChip,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
  },
  sectionCopy: {
    color: colors.slate,
    marginTop: -2,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: "center",
    ...shadows.glow,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  error: {
    color: colors.danger,
  },
  footnote: {
    color: colors.slate,
    lineHeight: 20,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    color: colors.slate,
    fontWeight: "700",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: radii.md,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  googleButtonMark: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: colors.brandBlueSoft,
    color: colors.brandBlue,
    fontWeight: "900",
    lineHeight: 30,
  },
  googleButtonText: {
    color: colors.brandBlueDeep,
    fontWeight: "800",
    fontSize: 15,
  },
  link: {
    color: colors.brandBlue,
    fontWeight: "800",
  },
});
