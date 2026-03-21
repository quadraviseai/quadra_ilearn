import { useEffect, useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import Screen from "../../src/components/Screen";
import { apiRequest } from "../../src/lib/api";
import { getPendingAuthRedirect } from "../../src/lib/authRedirect";
import { readSingleParam } from "../../src/lib/linking";
import { colors, gradients, radii, shadows, spacing } from "../../src/theme";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const uid = readSingleParam(params.uid);
  const token = readSingleParam(params.token);
  const linkReady = useMemo(() => Boolean(uid && token), [uid, token]);
  const [state, setState] = useState({
    loading: true,
    error: "",
    success: "",
  });
  const [loginHref, setLoginHref] = useState("/(auth)/login");

  useEffect(() => {
    let active = true;

    const loadRedirect = async () => {
      const redirect = await getPendingAuthRedirect();
      if (!active) {
        return;
      }
      setLoginHref(redirect ? { pathname: "/(auth)/login", params: { redirect } } : "/(auth)/login");
    };

    loadRedirect();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const verify = async () => {
      if (!linkReady) {
        setState({ loading: false, error: "Invalid or missing verification link.", success: "" });
        return;
      }

      try {
        const response = await apiRequest("/api/auth/verify-email", {
          method: "POST",
          body: { uid, token },
        });
        setState({ loading: false, error: "", success: response.message });
      } catch (error) {
        setState({ loading: false, error: error.message, success: "" });
      }
    };

    verify();
  }, [linkReady, token, uid]);

  return (
    <Screen>
      <LinearGradient colors={gradients.authHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.copy}>We are confirming your QuadraILearn registration link.</Text>
      </LinearGradient>

      <View style={styles.formCard}>
        {state.loading ? <Text style={styles.meta}>Verifying...</Text> : null}
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        {state.success ? <Text style={styles.success}>{state.success}</Text> : null}
        <Text style={styles.footnote}>
          Continue to <Link href={loginHref} style={styles.link}>Sign in</Link>
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
  meta: {
    color: colors.slate,
    fontSize: 14,
  },
  success: {
    color: colors.success,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
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
