import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

export default function StudentStudyPlanScreen() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  const loadPlan = useCallback(async () => {
    try {
      const data = await apiRequest("/api/study-planner/");
      setState({ loading: false, data, error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  }, []);

  const regeneratePlan = async () => {
    try {
      await apiRequest("/api/study-planner/regenerate", { method: "POST", body: {} });
      await loadPlan();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    }
  };

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  return (
    <Screen loading={state.loading} refreshControl={loadPlan}>
      <AppHeader title="Study plan" subtitle="Rebuild and review the same study planner used on the web app." />
      <View style={styles.header}>
        <Pressable style={styles.button} onPress={regeneratePlan}>
          <Text style={styles.buttonText}>Regenerate</Text>
        </Pressable>
      </View>

      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <SectionCard title={state.data?.title || "No active plan"} subtitle={`Status: ${state.data?.status || "unavailable"}`} tone="accent">
        <Text style={styles.meta}>Primary exam: {state.data?.primary_target_exam || "Not set"}</Text>
        <Text style={styles.meta}>Secondary exam: {state.data?.secondary_target_exam || "Not set"}</Text>
      </SectionCard>

      <SectionCard title="Tasks" subtitle="Pulled from the same study planner used on the web app.">
        {(state.data?.tasks || []).length ? state.data.tasks.map((task) => (
          <View key={task.id} style={styles.task}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskMeta}>{task.concept_name || "General"}</Text>
              <Text style={styles.taskMeta}>{task.description}</Text>
            </View>
            <Text style={styles.taskStatus}>{task.status}</Text>
          </View>
        )) : <Text style={styles.meta}>No tasks yet.</Text>}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.md,
    ...shadows.glow,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  meta: {
    color: colors.slate,
  },
  task: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  taskTitle: {
    color: colors.ink,
    fontWeight: "700",
  },
  taskMeta: {
    color: colors.slate,
    marginTop: 4,
  },
  taskStatus: {
    color: colors.accentStrong,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  error: {
    color: colors.danger,
  },
});
