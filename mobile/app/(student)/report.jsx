import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import {
  fetchLatestReport,
  fetchLearning,
  fetchReport,
  fetchWeakTopicAIReview,
  setSelectedFlow,
} from "../../src/lib/studentFlow";
import { colors, radii, spacing } from "../../src/theme";

export default function StudentReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reportId = params.reportId ? String(params.reportId) : "";
  const [state, setState] = useState({
    loading: true,
    error: "",
    report: null,
    learning: null,
    aiLoadingConceptId: "",
    aiReviews: {},
    tokenBalance: 0,
  });

  const load = useCallback(async () => {
    try {
      const report = reportId ? await fetchReport(reportId) : await fetchLatestReport();
      if (!report) {
        setState({
          loading: false,
          error: "",
          report: null,
          learning: null,
          aiLoadingConceptId: "",
          aiReviews: {},
          tokenBalance: 0,
        });
        return;
      }

      const learning = await fetchLearning(report.id);
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        report,
        learning,
        tokenBalance: learning.token_balance ?? current.tokenBalance,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message,
        report: null,
        learning: null,
      }));
    }
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  const scorePercent = useMemo(() => Math.round(Number(state.report?.score_percent || 0)), [state.report]);
  const learningCards = state.learning?.learning_cards || [];

  const handleGenerateAI = async (conceptId) => {
    if (!state.report?.id || !conceptId || state.aiReviews[conceptId]) {
      return;
    }
    try {
      setState((current) => ({ ...current, aiLoadingConceptId: conceptId, error: "" }));
      const review = await fetchWeakTopicAIReview(state.report.id, conceptId);
      setState((current) => ({
        ...current,
        aiLoadingConceptId: "",
        aiReviews: {
          ...current.aiReviews,
          [conceptId]: review,
        },
        tokenBalance: review.token_balance ?? current.tokenBalance,
      }));
    } catch (error) {
      setState((current) => ({ ...current, aiLoadingConceptId: "", error: error.message }));
    }
  };

  if (!state.report && !state.loading) {
    return (
      <Screen refreshControl={load} topPadding={0}>
        <AppHeader title="Result" subtitle="Your submitted mock test result will appear here." fullBleed />
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        <SectionCard title="No result yet" subtitle="Finish a mock test first to generate the result page.">
          <Pressable style={styles.primaryButton} onPress={() => router.replace("/(student)/diagnostics")}>
            <Text style={styles.primaryButtonText}>Go to exams</Text>
          </Pressable>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0}>
      <AppHeader title="Result" subtitle="Score, weak concepts, AI support, and tokens from the latest submitted exam." fullBleed />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <View style={styles.heroBar}>
        <View>
          <Text style={styles.heroLabel}>Your score</Text>
          <Text style={styles.heroValue}>{scorePercent}%</Text>
          <Text style={styles.heroMeta}>{state.report?.exam_name} | {state.report?.subject_name}</Text>
        </View>
        <View style={styles.tokenPill}>
          <Text style={styles.tokenLabel}>Tokens</Text>
          <Text style={styles.tokenValue}>{state.tokenBalance}</Text>
        </View>
      </View>

      <SectionCard title="Result summary" subtitle="This is the exam outcome from the submitted mock test.">
        <View style={styles.metricsRow}>
          {[
            ["Questions", state.report?.total_questions],
            ["Correct", state.report?.correct_answers],
            ["Wrong", state.report?.wrong_answers],
            ["Unanswered", state.report?.unanswered_answers],
          ].map(([label, value]) => (
            <View key={label} style={styles.metricTile}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value ?? "--"}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              await setSelectedFlow(state.report.exam, state.report.subject);
              router.replace("/(student)/diagnostics");
            }}
          >
            <Text style={styles.secondaryButtonText}>Retake exam</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonInline} onPress={() => router.push("/(student)/profile")}>
            <Text style={styles.primaryButtonText}>View tokens</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Weak concepts" subtitle="Generate AI guidance only for the concepts you want to unlock.">
        {learningCards.length ? (
          learningCards.map((card, index) => {
            const aiReview = state.aiReviews[card.concept_id];
            return (
              <View key={`${card.concept_id}-${card.topic}`} style={[styles.weakRow, index > 0 ? styles.weakRowBorder : null]}>
                <View style={styles.weakTop}>
                  <View style={styles.weakCopy}>
                    <Text style={styles.weakTopic}>{card.topic}</Text>
                    <Text style={styles.weakMeta}>{card.chapter || state.report?.subject_name} | {card.misses} misses</Text>
                  </View>
                  <Pressable
                    style={[styles.primaryButtonMini, state.aiLoadingConceptId === card.concept_id ? styles.disabled : null]}
                    disabled={state.aiLoadingConceptId === card.concept_id}
                    onPress={() => handleGenerateAI(card.concept_id)}
                  >
                    <Text style={styles.primaryButtonMiniText}>
                      {aiReview ? "AI ready" : state.aiLoadingConceptId === card.concept_id ? "Generating..." : "Generate AI"}
                    </Text>
                  </Pressable>
                </View>

                {aiReview ? (
                  <View style={styles.aiPanel}>
                    <Text style={styles.aiHeading}>{aiReview.heading}</Text>
                    <Text style={styles.aiText}>{aiReview.layman_explanation}</Text>
                    <Text style={styles.aiSubhead}>Teacher guide</Text>
                    <Text style={styles.aiText}>{aiReview.teacher_guide}</Text>
                    <Text style={styles.aiSubhead}>Solve steps</Text>
                    {(aiReview.solve_steps || []).map((step) => (
                      <Text key={step} style={styles.aiStep}>• {step}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.pendingText}>Tap `Generate AI` to spend tokens and unlock concept-specific guidance.</Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.pendingText}>No weak concepts were detected in this result.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  heroLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroValue: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  heroMeta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 4,
  },
  tokenPill: {
    minWidth: 92,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
  },
  tokenLabel: {
    color: colors.accentStrong,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tokenValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricTile: {
    width: "47%",
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  metricLabel: {
    color: colors.slate,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonInline: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 14,
  },
  weakRow: {
    gap: spacing.sm,
  },
  weakRowBorder: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  weakTop: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
  },
  weakCopy: {
    flex: 1,
  },
  weakTopic: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  weakMeta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 3,
  },
  primaryButtonMini: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  primaryButtonMiniText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  aiPanel: {
    gap: 8,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.sectionAlt,
  },
  aiHeading: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  aiSubhead: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 2,
  },
  aiText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  aiStep: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  pendingText: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.55,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
