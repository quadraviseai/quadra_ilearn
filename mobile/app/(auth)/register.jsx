import { useEffect, useMemo, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { apiRequest } from "../../src/lib/api";
import { colors, gradients, radii, shadows, spacing } from "../../src/theme";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_GOOGLE_WEB_CLIENT_ID = "52499757157-mr3kcemi7o13gilv87oqvrr0p8p9jvkv.apps.googleusercontent.com";
const DEFAULT_GOOGLE_ANDROID_CLIENT_ID = "52499757157-6724lll0jek5os124d8jctg11kfjhrck.apps.googleusercontent.com";
const DEFAULT_GOOGLE_IOS_CLIENT_ID = "52499757157-mr3kcemi7o13gilv87oqvrr0p8p9jvkv.apps.googleusercontent.com";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
  referral_code: "",
};

function routeForRole(role) {
  if (role === "admin") {
    return "/(admin)";
  }
  return "/(student)/diagnostics";
}

export default function RegisterScreen() {
  const router = useRouter();
  const { authenticateWithGoogle } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({
    loading: false,
    googleLoading: false,
    error: "",
    success: "",
  });

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_GOOGLE_WEB_CLIENT_ID;
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || DEFAULT_GOOGLE_ANDROID_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || DEFAULT_GOOGLE_IOS_CLIENT_ID;
  const nonce = useMemo(() => `${Date.now()}-quadrailearn-mobile-register`, []);
  const [googleRequest, googleResponse, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId: googleClientId,
    webClientId: googleClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    nonce,
  });

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setState((current) => ({ ...current, error: "Name, email, and password are required.", success: "" }));
      return;
    }

    try {
      setState((current) => ({ ...current, loading: true, error: "", success: "" }));
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: "student",
          phone: form.phone.trim(),
          referral_code: form.referral_code.trim(),
        },
      });
      setState((current) => ({
        ...current,
        loading: false,
        success: "Registration completed. Check your email to verify the account.",
      }));
      setTimeout(() => router.replace("/(auth)/login"), 900);
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message, success: "" }));
    }
  };

  useEffect(() => {
    const completeGoogleRegister = async () => {
      if (!googleResponse) {
        return;
      }

      if (googleResponse.type !== "success") {
        if (googleResponse.type !== "dismiss" && googleResponse.type !== "cancel") {
          setState((current) => ({ ...current, error: "Google sign-up was not completed." }));
        }
        setState((current) => ({ ...current, googleLoading: false }));
        return;
      }

      const credential = googleResponse.params?.id_token;
      if (!credential) {
        setState((current) => ({ ...current, googleLoading: false, error: "Google did not return an ID token." }));
        return;
      }

      try {
        const session = await authenticateWithGoogle({
          credential,
          intent: "register",
          name: form.name.trim(),
          role: "student",
          phone: form.phone.trim(),
          referral_code: form.referral_code.trim(),
        });
        router.replace(routeForRole(session.user.role));
      } catch (error) {
        setState((current) => ({ ...current, error: error.message }));
      } finally {
        setState((current) => ({ ...current, googleLoading: false }));
      }
    };

    completeGoogleRegister();
  }, [authenticateWithGoogle, form.name, form.phone, form.referral_code, googleResponse, router]);

  const handleGoogleRegister = async () => {
    if (!form.name.trim()) {
      setState((current) => ({ ...current, error: "Add your full name before continuing with Google.", success: "" }));
      return;
    }
    if (!googleRequest) {
      setState((current) => ({ ...current, error: "Google sign-in is not ready yet.", success: "" }));
      return;
    }

    setState((current) => ({ ...current, error: "", success: "", googleLoading: true }));
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
            <Text style={styles.heroKicker}>Native student registration</Text>
          </View>
        </View>
        <Text style={styles.title}>Create your QuadraILearn account on mobile.</Text>
        <Text style={styles.copy}>
          Start as a student, keep referral rewards, and use the same account across mobile and web.
        </Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Create account</Text>
        <Text style={styles.sectionCopy}>Set up your student account with email/password or Google.</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.slateSoft}
          value={form.name}
          onChangeText={(value) => setField("name", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Mobile"
          placeholderTextColor={colors.slateSoft}
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(value) => setField("phone", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.slateSoft}
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(value) => setField("email", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.slateSoft}
          secureTextEntry
          value={form.password}
          onChangeText={(value) => setField("password", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Referral code (optional)"
          placeholderTextColor={colors.slateSoft}
          autoCapitalize="characters"
          value={form.referral_code}
          onChangeText={(value) => setField("referral_code", value.toUpperCase())}
        />

        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        {state.success ? <Text style={styles.success}>{state.success}</Text> : null}

        <Pressable style={[styles.button, state.loading ? styles.buttonDisabled : null]} onPress={handleSubmit} disabled={state.loading}>
          <Text style={styles.buttonText}>{state.loading ? "Creating account..." : "Create account"}</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.googleButton, (state.googleLoading || state.loading) ? styles.buttonDisabled : null]}
          onPress={handleGoogleRegister}
          disabled={state.googleLoading || state.loading}
        >
          <Text style={styles.googleButtonMark}>G</Text>
          <Text style={styles.googleButtonText}>{state.googleLoading ? "Opening Google..." : "Continue with Google"}</Text>
        </Pressable>

        <Text style={styles.footnote}>
          Already registered? <Link href="/(auth)/login" style={styles.link}>Sign in</Link>
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  copy: {
    color: colors.slate,
    fontSize: 15,
    lineHeight: 22,
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
  success: {
    color: colors.success,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
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
  footnote: {
    color: colors.slate,
    lineHeight: 20,
  },
  link: {
    color: colors.brandBlue,
    fontWeight: "800",
  },
});
