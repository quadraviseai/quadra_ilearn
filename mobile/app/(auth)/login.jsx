import { useEffect, useMemo, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radii, shadows, spacing } from "../../src/theme";

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
      <View style={styles.pageShell}>
        <View style={styles.authCard}>
          <View style={styles.logoRow}>
            <Image source={require("../../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.logoWordmark}>QuadraILearn</Text>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Login to your Account</Text>
          </View>

          <View style={styles.formCard}>
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
              <Link href="/(auth)/register" style={styles.link}>
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
    minHeight: 640,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  authCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 32,
    backgroundColor: "#fefefe",
    paddingHorizontal: 22,
    paddingVertical: 28,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(76, 99, 197, 0.08)",
    ...shadows.card,
  },
  logoRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  logoWordmark: {
    color: "#3048b9",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  headerBlock: {
    gap: 4,
  },
  title: {
    color: "#2b3663",
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 0,
    gap: spacing.md,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "rgba(43, 54, 99, 0.08)",
    color: "#24325d",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#3048b9",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
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
    color: "#98a1c3",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  socialRow: {
    alignItems: "center",
  },
  googleOnlyButton: {
    minWidth: 220,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(43, 54, 99, 0.08)",
    backgroundColor: "#ffffff",
  },
  googleGlyph: {
    color: "#ea4335",
    fontWeight: "900",
    fontSize: 18,
  },
  googleOnlyText: {
    color: "#3048b9",
    fontWeight: "800",
    fontSize: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  footerText: {
    color: "#98a1c3",
    fontSize: 12,
  },
  inlineLinks: {
    alignItems: "center",
    marginTop: -4,
  },
  inlineLink: {
    color: "#3048b9",
    fontWeight: "700",
    fontSize: 12,
  },
  link: {
    color: "#3048b9",
    fontWeight: "700",
    fontSize: 12,
  },
});
