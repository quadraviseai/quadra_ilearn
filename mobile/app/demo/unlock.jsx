import { useEffect, useMemo, useState } from "react";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/Screen";
import { apiRequest } from "../../src/lib/api";
import { useAuth } from "../../src/context/AuthContext";
import { clearPendingAuthRedirect, setPendingAuthRedirect } from "../../src/lib/authRedirect";
import {
  buildNativeGoogleRedirect,
  clearPendingGoogleAuth,
  DEFAULT_GOOGLE_ANDROID_CLIENT_ID,
  DEFAULT_GOOGLE_IOS_CLIENT_ID,
  DEFAULT_GOOGLE_WEB_CLIENT_ID,
  setPendingGoogleAuth,
} from "../../src/lib/googleAuth";

const redirectTarget = "/demo/full-report";
const initialForm = {
  name: "",
  email: "",
  mobile: "",
  password: "",
};

WebBrowser.maybeCompleteAuthSession();

export default function DemoUnlockScreen() {
  const router = useRouter();
  const { authenticateWithGoogle, logout } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
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

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const closeEmailModal = () => {
    if (emailLoading) {
      return;
    }
    setEmailError("");
    setVerificationEmail("");
    setEmailModalVisible(false);
  };

  const handleEmailContinue = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.mobile.trim() || !form.password.trim()) {
      setEmailError("Full name, email, mobile number, and password are required.");
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError("");
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
      setVerificationEmail(form.email.trim());
    } catch (requestError) {
      setEmailError(requestError.message || "Unable to continue with email.");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.content}>
          <View style={styles.lockHero}>
            <View style={styles.lockHeroBadge}>
              <Ionicons name="lock-closed" size={34} color="#FF7A00" />
            </View>
          </View>
          <View style={styles.headlineBlock}>
            <Text style={styles.title}>Unlock Your Full Report</Text>
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

            <Pressable style={styles.secondaryButton} onPress={() => setEmailModalVisible(true)}>
              <Text style={styles.secondaryButtonText}>Continue with Email</Text>
            </Pressable>

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
                  onPress={() => router.replace({ pathname: "/(auth)/login", params: { redirect: redirectTarget } })}
                >
                  <Text style={styles.modalPrimaryButtonText}>Go to Sign in</Text>
                </Pressable>

                <Pressable
                  style={styles.modalSecondaryButton}
                  onPress={() => {
                    setVerificationEmail("");
                    setEmailError("");
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

                  {emailError ? <Text style={styles.error}>{emailError}</Text> : null}

                  <Pressable style={[styles.modalPrimaryButton, emailLoading ? styles.primaryButtonDisabled : null]} onPress={handleEmailContinue} disabled={emailLoading}>
                    <Text style={styles.modalPrimaryButtonText}>{emailLoading ? "Continuing..." : "Continue"}</Text>
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
  wrap: {
    flex: 1,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    gap: 18,
    justifyContent: "center",
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
    alignItems: "center",
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
    textAlign: "center",
  },
  lockHero: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -4,
  },
  lockHeroBadge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    paddingHorizontal: 18,
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: "#F8FAFC",
    width: "100%",
    maxWidth: 420,
    maxHeight: "82%",
    borderRadius: 24,
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
});
