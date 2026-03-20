import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

const emptyForm = {
  initial_login_bonus: "",
  referral_bonus: "",
  weak_topic_unlock_cost: "",
  timer_reset_cost: "",
};

export default function AdminTokenRulesScreen() {
  const [form, setForm] = useState(emptyForm);
  const [state, setState] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
  });

  const load = useCallback(async () => {
    try {
      const settings = await apiRequest("/api/admin/token-settings");
      setForm({
        initial_login_bonus: String(settings.initial_login_bonus ?? ""),
        referral_bonus: String(settings.referral_bonus ?? ""),
        weak_topic_unlock_cost: String(settings.weak_topic_unlock_cost ?? ""),
        timer_reset_cost: String(settings.timer_reset_cost ?? ""),
      });
      setState({ loading: false, saving: false, error: "", success: "" });
    } catch (error) {
      setState({ loading: false, saving: false, error: error.message, success: "" });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      setState((current) => ({ ...current, saving: true, error: "", success: "" }));
      await apiRequest("/api/admin/token-settings", {
        method: "PATCH",
        body: {
          initial_login_bonus: Number(form.initial_login_bonus || 0),
          referral_bonus: Number(form.referral_bonus || 0),
          weak_topic_unlock_cost: Number(form.weak_topic_unlock_cost || 0),
          timer_reset_cost: Number(form.timer_reset_cost || 0),
        },
      });
      setState((current) => ({ ...current, saving: false, success: "Token rules updated." }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
    }
  };

  const fields = [
    ["Welcome bonus", "initial_login_bonus"],
    ["Referral bonus", "referral_bonus"],
    ["Weak chapter unlock", "weak_topic_unlock_cost"],
    ["Timer reset", "timer_reset_cost"],
  ];

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0}>
      <AppHeader title="Token Rules" subtitle="Adjust the live token economy without leaving mobile." fullBleed />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
      {state.success ? <Text style={styles.success}>{state.success}</Text> : null}

      <SectionCard title="Economy controls" subtitle="These values apply to new rewards and token spends immediately." tone="accent">
        {fields.map(([label, key]) => (
          <View key={key} style={styles.fieldGroup}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={label}
              placeholderTextColor={colors.slateSoft}
              value={form[key]}
              onChangeText={(value) => setForm((current) => ({ ...current, [key]: value.replace(/[^0-9]/g, "") }))}
            />
          </View>
        ))}

        <Pressable style={[styles.button, state.saving ? styles.disabled : null]} disabled={state.saving} onPress={save}>
          <Text style={styles.buttonText}>{state.saving ? "Saving..." : "Save token rules"}</Text>
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    ...shadows.card,
  },
  button: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.55,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  success: {
    color: colors.success,
    fontSize: 13,
  },
});
