import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

export default function StudentProfileScreen() {
  const [state, setState] = useState({ loading: true, error: "", success: "" });
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    class_name: "",
    board: "",
    school_name: "",
    primary_target_exam: "",
    secondary_target_exam: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiRequest("/api/students/profile");
      setForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        class_name: data.class_name || "",
        board: data.board || "",
        school_name: data.school_name || "",
        primary_target_exam: data.primary_target_exam || "",
        secondary_target_exam: data.secondary_target_exam || "",
      });
      setState({ loading: false, error: "", success: "" });
    } catch (error) {
      setState({ loading: false, error: error.message, success: "" });
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    try {
      await apiRequest("/api/students/profile", {
        method: "PATCH",
        body: form,
      });
      setState((current) => ({ ...current, success: "Profile updated.", error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, success: "" }));
    }
  };

  return (
    <Screen loading={state.loading}>
      <AppHeader title="Profile" subtitle="Update the student details and exam targets used across the app." />
      <SectionCard title="Student details" subtitle="Updates sync directly to the live backend profile.">
        {Object.entries({
          "Full name": "full_name",
          Phone: "phone",
          Class: "class_name",
          Board: "board",
          School: "school_name",
          "Primary exam": "primary_target_exam",
          "Secondary exam": "secondary_target_exam",
        }).map(([label, key]) => (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={label}
            value={form[key]}
            onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
          />
        ))}
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        {state.success ? <Text style={styles.success}>{state.success}</Text> : null}
        <Pressable style={styles.button} onPress={saveProfile}>
          <Text style={styles.buttonText}>Save profile</Text>
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    ...shadows.glow,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
  },
  success: {
    color: colors.accentStrong,
  },
});
