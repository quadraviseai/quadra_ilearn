import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { fetchLatestReport, setSelectedFlow } from "../../src/lib/studentFlow";
import { colors, radii, shadows, spacing } from "../../src/theme";

export default function StudentReportScreen() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: "", report: null });

  const load = useCallback(async () => {
    try {
      const report = await fetchLatestReport();
      setState({ loading: false, error: "", report });
    } catch (error) {
      setState({ loading: false, error: error.message, report: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const report = state.report;
  const weakTopics = report?.weak_topics || [];
  const scorePercent = useMemo(() => Math.round(Number(report?.score_percent || 0)), [report]);

  if (!report && !state.loading) {
    return (
      <Screen refreshControl={load}>
        <AppHeader title="Report" subtitle="Your latest submitted diagnostic result appears here." />
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        <SectionCard title="No report yet" subtitle="Complete a diagnostic attempt to generate this section.">
          <Pressable style={styles.primaryButton} onPress={() => router.push("/(student)/diagnostics")}>
            <Text style={styles.primaryButtonText}>Start diagnostic</Text>
          </Pressable>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader title="Latest report" subtitle="Review performance, identify weak topics, and decide the next move." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <SectionCard title={report?.exam_name || "Latest report"} subtitle={report ? `${report.subject_name} diagnostic summary` : ""} tone="accent">
        <View style={styles.scoreHero}>
          <View>
            <Text style={styles.scoreLabel}>Your score</Text>
            <Text style={styles.scoreValue}>{scorePercent}%</Text>
            <Text style={styles.scoreMeta}>
              {report?.correct_answers} correct out of {report?.total_questions} questions
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scorePillLabel}>Weak topics</Text>
            <Text style={styles.scorePillValue}>{weakTopics.length}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              await setSelectedFlow(report.exam, report.subject);
              router.push("/(student)/diagnostics");
            }}
          >
            <Text style={styles.secondaryButtonText}>Retest</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => router.push("/(student)/learn")}>
            <Text style={styles.primaryButtonText}>Open learn</Text>
          </Pressable>
        </View>
      </SectionCard>

      <View style={styles.metricsRow}>
        {[
          ["Questions", report?.total_questions],
          ["Correct", report?.correct_answers],
          ["Wrong", report?.wrong_answers],
          ["Unanswered", report?.unanswered_answers],
        ].map(([label, value]) => (
          <View key={label} style={styles.metricTile}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value ?? "--"}</Text>
          </View>
        ))}
      </View>

      <SectionCard title="Weak topics" subtitle="The concepts that need targeted follow-up first.">
        {weakTopics.length ? (
          weakTopics.map((topic, index) => (
            <Pressable
              key={`${topic.concept_id}-${topic.topic}`}
              style={styles.topicRow}
              onPress={() =>
                router.push({
                  pathname: "/(student)/learn",
                  params: topic.concept_id ? { conceptId: String(topic.concept_id) } : undefined,
                })
              }
            >
              <View style={styles.topicCopy}>
                <Text style={styles.topicPriority}>Priority {index + 1}</Text>
                <Text style={styles.topicTitle}>{topic.topic}</Text>
              </View>
              <View style={styles.topicBadge}>
                <Text style={styles.topicBadgeText}>{topic.misses} misses</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No weak topics were detected in this attempt.</Text>
        )}
      </SectionCard>

      <SectionCard title="Next actions" subtitle="Use the mobile app to convert this report into the next study move.">
        <View style={styles.stepList}>
          <Text style={styles.stepText}>1. Open the weak-topic review section.</Text>
          <Text style={styles.stepText}>2. Read the AI guidance and concept summary.</Text>
          <Text style={styles.stepText}>3. Start a retest when you are ready.</Text>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreHero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  scoreLabel: {
    color: colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: "800",
  },
  scoreValue: {
    color: colors.ink,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    marginTop: 8,
  },
  scoreMeta: {
    color: colors.slate,
    marginTop: 6,
  },
  scorePill: {
    minWidth: 110,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(251, 100, 4, 0.18)",
  },
  scorePillLabel: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scorePillValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.accent,
    ...shadows.glow,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricTile: {
    width: "47%",
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  metricLabel: {
    color: colors.slate,
    textTransform: "uppercase",
    fontSize: 10,
    fontWeight: "800",
  },
  metricValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  topicCopy: {
    flex: 1,
  },
  topicPriority: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  topicTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  topicBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.brandBlueSoft,
  },
  topicBadgeText: {
    color: colors.brandBlue,
    fontWeight: "800",
    fontSize: 12,
  },
  stepList: {
    gap: 10,
  },
  stepText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.slate,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
