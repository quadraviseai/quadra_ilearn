import { useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Screen from "../../src/components/Screen";
import { apiRequest } from "../../src/lib/api";
import { readSingleParam } from "../../src/lib/linking";
import { colors, gradients, radii, shadows, spacing } from "../../src/theme";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const uid = readSingleParam(params.uid);
  const token = readSingleParam(params.token);
  const linkReady = useMemo(() => Boolean(uid && token), [uid, token]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState({
    loading: false,
    error: "",
    success: "",
  });

  const handleSubmit = async () => {
    if (!linkReady) {
      setState((current) => ({ ...current, error: "Invalid or missing reset link." }));
      return;
    }
    if (password !== confirmPassword) {
      setState((current) => ({ ...current, error: "Passwords do not match.", success: "" }));
      return;
    }

    try {
      setState((current) => ({ ...current, loading: true, error: "", success: "" }));
      const response = await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: { uid, token, password },
      });
      setState((current) => ({ ...current, loading: false, success: response.message }));
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  return (
    <Screen>
      <LinearGradient colors={gradients.authHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.copy}>Create a new password for your QuadraILearn account.</Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Reset password</Text>
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor={colors.slateSoft}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={linkReady}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={colors.slateSoft}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={linkReady}
        />
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        {state.success ? <Text style={styles.success}>{state.success}</Text> : null}
        <Pressable
          style={[styles.button, (state.loading || !linkReady) ? styles.buttonDisabled : null]}
          onPress={handleSubmit}
          disabled={state.loading || !linkReady}
        >
          <Text style={styles.buttonText}>{state.loading ? "Updating..." : "Update password"}</Text>
        </Pressable>
        <Text style={styles.footnote}>
          Back to <Link href="/(auth)/login" style={styles.link}>Sign in</Link>
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
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
  footnote: {
    color: colors.slate,
    lineHeight: 20,
  },
  link: {
    color: colors.brandBlue,
    fontWeight: "800",
  },
});
