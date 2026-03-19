import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import StatTile from "../../src/components/StatTile";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, spacing } from "../../src/theme";

export default function GuardianHomeScreen() {
  const [state, setState] = useState({ loading: true, students: [], error: "" });

  const loadStudents = useCallback(async () => {
    try {
      const students = await apiRequest("/api/guardian/students");
      setState({ loading: false, students, error: "" });
    } catch (error) {
      setState({ loading: false, students: [], error: error.message });
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const activeCount = state.students.filter((item) => item.link_status === "active").length;

  return (
    <Screen loading={state.loading} refreshControl={loadStudents}>
      <AppHeader title="Guardian dashboard" subtitle="Monitor linked students and keep progress visible." />

      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <View style={styles.metricRow}>
        <StatTile label="Linked students" value={state.students.length} />
        <StatTile label="Active links" value={activeCount} tone="gold" />
      </View>

      <SectionCard title="Quick view" subtitle="Latest student health and exam targets at a glance." tone="accent">
        {state.students.map((student) => (
          <View key={student.id} style={styles.studentRow}>
            <View style={styles.studentStripe} />
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{student.full_name}</Text>
              <Text style={styles.meta}>
                {student.class_name}
                {student.board ? ` | ${student.board}` : ""}
              </Text>
              <Text style={styles.meta}>Primary: {student.primary_target_exam || "Not set"}</Text>
            </View>
            <Text style={styles.health}>{student.latest_learning_health?.health_score ?? "--"}</Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  studentRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  studentStripe: {
    width: 10,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlue,
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
  error: {
    color: colors.danger,
  },
});
