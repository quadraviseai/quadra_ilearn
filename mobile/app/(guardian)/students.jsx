import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

const initialCreateForm = {
  name: "",
  email: "",
  class_name: "",
  board: "",
  school_name: "",
  primary_target_exam: "",
  secondary_target_exam: "",
};

export default function GuardianStudentsScreen() {
  const [students, setStudents] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [state, setState] = useState({ loading: true, error: "", success: "" });

  const loadStudents = useCallback(async () => {
    try {
      const data = await apiRequest("/api/guardian/students");
      setStudents(data);
      setState({ loading: false, error: "", success: "" });
    } catch (error) {
      setState({ loading: false, error: error.message, success: "" });
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const sendInvite = async () => {
    try {
      const response = await apiRequest("/api/guardian/invite", {
        method: "POST",
        body: { email: inviteEmail },
      });
      setState((current) => ({ ...current, success: `Invite token generated for ${inviteEmail}.`, error: "" }));
      setInviteEmail("");
      if (response.student_exists) {
        await loadStudents();
      }
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, success: "" }));
    }
  };

  const createStudent = async () => {
    try {
      const response = await apiRequest("/api/guardian/create-student", {
        method: "POST",
        body: createForm,
      });
      setState((current) => ({
        ...current,
        success: `Student created. Temporary password: ${response.temporary_password}`,
        error: "",
      }));
      setCreateForm(initialCreateForm);
      await loadStudents();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, success: "" }));
    }
  };

  return (
    <Screen loading={state.loading} refreshControl={loadStudents}>
      <AppHeader title="Students" subtitle="Invite, create, and manage linked student accounts." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
      {state.success ? <Text style={styles.success}>{state.success}</Text> : null}

      <SectionCard title="Linked students" subtitle="Students already attached to this guardian account." tone="accent">
        {students.length ? students.map((student) => (
          <View key={student.id} style={styles.studentRow}>
            <View style={styles.studentStripe} />
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{student.full_name}</Text>
              <Text style={styles.meta}>{student.email}</Text>
              <Text style={styles.meta}>Status: {student.link_status}</Text>
            </View>
            <Text style={styles.health}>{student.latest_learning_health?.health_score ?? "--"}</Text>
          </View>
        )) : <Text style={styles.meta}>No linked students yet.</Text>}
      </SectionCard>

      <SectionCard title="Invite existing student" subtitle="Send an invite to a student already registered in the platform.">
        <TextInput
          style={styles.input}
          placeholder="student@email.com"
          value={inviteEmail}
          onChangeText={setInviteEmail}
          autoCapitalize="none"
        />
        <Pressable style={styles.button} onPress={sendInvite}>
          <Text style={styles.buttonText}>Generate invite</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Create and link student" subtitle="Create a new student account directly from the guardian app.">
        {[
          ["Full name", "name"],
          ["Email", "email"],
          ["Class", "class_name"],
          ["Board", "board"],
          ["School", "school_name"],
          ["Primary exam", "primary_target_exam"],
          ["Secondary exam", "secondary_target_exam"],
        ].map(([label, key]) => (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={label}
            value={createForm[key]}
            onChangeText={(value) => setCreateForm((current) => ({ ...current, [key]: value }))}
            autoCapitalize={key === "email" ? "none" : "sentences"}
          />
        ))}
        <Pressable style={styles.button} onPress={createStudent}>
          <Text style={styles.buttonText}>Create student</Text>
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  studentStripe: {
    width: 10,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  studentName: {
    color: colors.ink,
    fontWeight: "700",
  },
  meta: {
    color: colors.slate,
    marginTop: 4,
  },
  health: {
    color: colors.accentStrong,
    fontWeight: "800",
    fontSize: 22,
  },
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
