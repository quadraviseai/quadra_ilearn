import { useEffect, useMemo, useState } from "react";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { apiRequest } from "../../src/lib/api";
import { clearPendingAuthRedirect, getPendingAuthRedirect, setPendingAuthRedirect } from "../../src/lib/authRedirect";
import { buildDemoResult } from "../../src/lib/demoTest";
import {
  buildNativeGoogleRedirect,
  clearPendingGoogleAuth,
  DEFAULT_GOOGLE_ANDROID_CLIENT_ID,
  DEFAULT_GOOGLE_IOS_CLIENT_ID,
  DEFAULT_GOOGLE_WEB_CLIENT_ID,
  setPendingGoogleAuth,
} from "../../src/lib/googleAuth";

WebBrowser.maybeCompleteAuthSession();

function routeForRole(role) {
  if (role === "admin") {
    return "/(admin)";
  }
  return "/(student)/diagnostics";
}

const initialForm = {
  name: "",
  email: "",
  mobile: "",
  password: "",
};

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { authenticateWithGoogle } = useAuth();
  const result = buildDemoResult();
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({
    loading: false,
    googleLoading: false,
    error: "",
    success: "",
  });
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

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
  const nonce = useMemo(() => `${Date.now()}-quadrailearn-mobile-register`, []);
  const [googleRequest, googleResponse, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
    redirectUri: Platform.OS === "web" ? undefined : googleRedirectUri,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    nonce,
  });
  const redirectPath = typeof params.redirect === "string" && params.redirect ? params.redirect : "";

  useEffect(() => {
    if (!redirectPath) {
      return;
    }
    void setPendingAuthRedirect(redirectPath);
  }, [redirectPath]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const closeEmailModal = () => {
    if (state.loading) {
      return;
    }
    setState((current) => ({ ...current, error: "", success: "" }));
    setVerificationEmail("");
    setEmailModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.mobile.trim() || !form.password.trim()) {
      setState((current) => ({
        ...current,
        error: "Full name, email, mobile number, and password are required.",
        success: "",
      }));
      return;
    }

    try {
      setState((current) => ({ ...current, loading: true, error: "", success: "" }));
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.mobile.trim(),
          password: form.password,
          role: "student",
        },
      });
      setState((current) => ({
        ...current,
        loading: false,
        success: "Activation email sent. Open the verification link in your email to finish signup.",
      }));
      setVerificationEmail(form.email.trim());
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

      const credential = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
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
          phone: form.mobile.trim(),
        });
        const nextPath = redirectPath || (await getPendingAuthRedirect()) || routeForRole(session.user.role);
        await clearPendingGoogleAuth();
        await clearPendingAuthRedirect();
        router.replace(nextPath);
      } catch (error) {
        setState((current) => ({ ...current, error: error.message }));
      } finally {
        setState((current) => ({ ...current, googleLoading: false }));
      }
    };

    completeGoogleRegister();
  }, [authenticateWithGoogle, form.mobile, form.name, googleResponse, redirectPath, router]);

  const handleGoogleRegister = async () => {
    if (!googleRequest) {
      return;
    }

    setState((current) => ({ ...current, error: "", success: "", googleLoading: true }));
    if (Platform.OS !== "web") {
      await setPendingGoogleAuth({
        intent: "register",
        redirectPath,
        name: form.name.trim(),
        phone: form.mobile.trim(),
        codeVerifier: googleRequest.codeVerifier || "",
        redirectUri: googleRedirectUri,
      });
    }
    await promptAsync();
  };

  return (
    <Screen>
      <View style={styles.page}>
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
              <Text style={styles.resultRank}>You beat {result.betterThan}% of students</Text>
            </View>
          ) : null}

          <View style={styles.headlineBlock}>
            <Text style={styles.title}>Unlock Your Full Report</Text>
            <Text style={styles.copy}>Create your account to save your result and see your full analysis.</Text>
          </View>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>+</Text>
              <Text style={styles.bulletText}>Your exact rank</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>+</Text>
              <Text style={styles.bulletText}>Weak topics analysis</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>+</Text>
              <Text style={styles.bulletText}>AI explanations</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>+</Text>
              <Text style={styles.bulletText}>Personalized improvement plan</Text>
            </View>
          </View>

          <Pressable
            style={[styles.googleButton, (state.googleLoading || state.loading) ? styles.buttonDisabled : null]}
            onPress={handleGoogleRegister}
            disabled={state.googleLoading || state.loading}
          >
            <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            <Text style={styles.googleButtonText}>{state.googleLoading ? "Opening Google..." : "Continue with Google"}</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.emailEntryButton} onPress={() => setEmailModalVisible(true)}>
            <Text style={styles.emailEntryButtonText}>Continue with Email</Text>
          </Pressable>

          <Text style={styles.trustText}>Takes less than 10 seconds</Text>

          <Text style={styles.footerText}>
            Already have an account?{" "}
            <Link href={redirectPath ? { pathname: "/(auth)/login", params: { redirect: redirectPath } } : "/(auth)/login"} style={styles.link}>
              Sign in
            </Link>
          </Text>
        </View>
      </View>

      <Modal visible={emailModalVisible} animationType="slide" transparent onRequestClose={closeEmailModal}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={closeEmailModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Continue with Email</Text>
              <Pressable style={styles.modalClose} onPress={closeEmailModal}>
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalCopy}>Enter your details below. We will send an activation link to your email.</Text>

            {verificationEmail ? (
              <View style={styles.successState}>
                <View style={styles.successCard}>
                  <Ionicons name="mail-open-outline" size={22} color="#1D4E89" />
                  <Text style={styles.successTitle}>Check your email</Text>
                  <Text style={styles.successDescription}>
                    We sent an activation link to {verificationEmail}. Open that link to finish creating your account.
                  </Text>
                </View>

                <Pressable
                  style={styles.modalPrimaryButton}
                  onPress={() =>
                    router.replace(redirectPath ? { pathname: "/(auth)/login", params: { redirect: redirectPath } } : "/(auth)/login")
                  }
                >
                  <Text style={styles.modalPrimaryButtonText}>Go to Sign in</Text>
                </Pressable>

                <Pressable
                  style={styles.modalSecondaryButton}
                  onPress={() => {
                    setVerificationEmail("");
                    setState((current) => ({ ...current, error: "", success: "" }));
                  }}
                >
                  <Text style={styles.modalSecondaryButtonText}>Use another email</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.formBlock}>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#94A3B8"
                    autoComplete="name"
                    value={form.name}
                    onChangeText={(value) => setField("name", value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    value={form.email}
                    onChangeText={(value) => setField("email", value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={form.mobile}
                    onChangeText={(value) => setField("mobile", value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    autoComplete="new-password"
                    value={form.password}
                    onChangeText={(value) => setField("password", value)}
                  />

                  {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
                  {state.success ? <Text style={styles.success}>{state.success}</Text> : null}

                  <Pressable style={[styles.modalPrimaryButton, state.loading ? styles.buttonDisabled : null]} onPress={handleSubmit} disabled={state.loading}>
                    <Text style={styles.modalPrimaryButtonText}>{state.loading ? "Continuing..." : "Continue"}</Text>
                  </Pressable>
                </View>

                <Text style={styles.modalTrustText}>Verification happens through the activation link sent to your email.</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 8,
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
  content: {
    gap: 18,
    paddingBottom: 24,
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
    fontSize: 16,
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
  googleButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  emailEntryButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  emailEntryButtonText: {
    color: "#1D4E89",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  trustText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  footerText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: "#1D4E89",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  modalScrim: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalCopy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
  },
  formBlock: {
    gap: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#0F172A",
    fontSize: 14,
  },
  modalPrimaryButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalTrustText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  successState: {
    gap: 14,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 18,
    gap: 10,
  },
  successTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  successDescription: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
  },
  modalSecondaryButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButtonText: {
    color: "#1D4E89",
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    color: "#C54F4F",
    fontSize: 13,
    lineHeight: 18,
  },
  success: {
    color: "#248F63",
    fontSize: 13,
    lineHeight: 18,
  },
});
