import { useState } from "react";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Screen from "../../src/components/Screen";
import { apiRequest } from "../../src/lib/api";
import { colors, gradients, radii, shadows, spacing } from "../../src/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({
    loading: false,
    error: "",
    success: "",
  });

  const handleSubmit = async () => {
    if (!email.trim()) {
      setState((current) => ({ ...current, error: "Enter your email address.", success: "" }));
      return;
    }

    try {
      setState((current) => ({ ...current, loading: true, error: "", success: "" }));
      const response = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setState((current) => ({ ...current, loading: false, success: response.message }));
      setEmail("");
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  return (
    <Screen>
      <LinearGradient colors={gradients.authHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroMark}>
          <Text style={styles.heroMarkText}>Q</Text>
        </View>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.copy}>We will send a reset link to your email. The link works on web and mobile.</Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Forgot password</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.slateSoft}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        {state.success ? <Text style={styles.success}>{state.success}</Text> : null}
        <Pressable style={[styles.button, state.loading ? styles.buttonDisabled : null]} onPress={handleSubmit} disabled={state.loading}>
          <Text style={styles.buttonText}>{state.loading ? "Sending..." : "Send reset email"}</Text>
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
  heroMark: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    ...shadows.glow,
  },
  heroMarkText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
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
