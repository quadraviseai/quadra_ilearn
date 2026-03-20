import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import {
  fetchLatestReport,
  fetchLearning,
  fetchWeakTopicAIReview,
  setSelectedFlow,
} from "../../src/lib/studentFlow";
import { colors, radii, shadows, spacing } from "../../src/theme";

export default function StudentLearnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conceptId = params.conceptId ? String(params.conceptId) : "";
  const [state, setState] = useState({
    loading: true,
    error: "",
    report: null,
    cards: [],
    learningMeta: null,
    aiReview: null,
  });

  const load = useCallback(async () => {
    try {
      const report = await fetchLatestReport();
      if (!report) {
        setState({
          loading: false,
          error: "",
          report: null,
          cards: [],
          learningMeta: null,
          aiReview: null,
        });
        return;
      }

      const learning = await fetchLearning(report.id);
      const cards = learning.learning_cards || [];
      const activeCard =
        (conceptId ? cards.find((item) => String(item.concept_id) === conceptId) : null) || cards[0] || null;
      const aiReview = activeCard?.concept_id ? await fetchWeakTopicAIReview(report.id, activeCard.concept_id) : null;

      setState({
        loading: false,
        error: "",
        report,
        cards,
        learningMeta: learning,
        aiReview,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error.message,
        report: null,
        cards: [],
        learningMeta: null,
        aiReview: null,
      });
    }
  }, [conceptId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCard = useMemo(() => {
    if (!state.cards.length) {
      return null;
    }
    return (conceptId ? state.cards.find((item) => String(item.concept_id) === conceptId) : null) || state.cards[0];
  }, [conceptId, state.cards]);

  if (!state.report && !state.loading) {
    return (
      <Screen refreshControl={load}>
        <AppHeader title="Learn" subtitle="Weak-topic guidance appears here after the first submitted report." />
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        <SectionCard title="No learning content yet" subtitle="Finish an exam and open the report first.">
          <Pressable style={styles.primaryButton} onPress={() => router.push("/(student)/diagnostics")}>
            <Text style={styles.primaryButtonText}>Start exam</Text>
          </Pressable>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader title="Weak-topic coach" subtitle="Teacher-style explanations and next-step practice from the latest report." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      {activeCard ? (
        <>
          <View style={styles.topicHero}>
            <Text style={styles.topicHeroEyebrow}>Learning focus</Text>
            <Text style={styles.topicHeroTitle}>{activeCard.topic}</Text>
            <Text style={styles.topicHeroMeta}>{activeCard.chapter || state.report?.subject_name}</Text>
          </View>

          <SectionCard title={activeCard.topic} subtitle={activeCard.chapter || state.report?.subject_name} tone="accent">
            <Text style={styles.headline}>{state.aiReview?.heading || activeCard.topic}</Text>
            <Text style={styles.summary}>{state.aiReview?.layman_explanation || activeCard.summary}</Text>
            <View style={styles.inlineMeta}>
              <View style={styles.inlineMetaCard}>
                <Text style={styles.inlineMetaLabel}>Misses</Text>
                <Text style={styles.inlineMetaValue}>{activeCard.misses}</Text>
              </View>
              <View style={styles.inlineMetaCard}>
                <Text style={styles.inlineMetaLabel}>Tokens</Text>
                <Text style={styles.inlineMetaValue}>{state.learningMeta?.token_balance ?? 0}</Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Teacher explains" subtitle="A concise walkthrough of where this topic usually goes wrong.">
            <Text style={styles.bodyText}>
              {state.aiReview?.teacher_guide
                || "This concept becomes easier when you use one steady method and stop switching approaches midway."}
            </Text>
            <Text style={styles.bodyText}>
              {state.aiReview?.common_trap || "Common trap: rushing into the answer before identifying the exact concept pattern."}
            </Text>
          </SectionCard>

          <SectionCard title="Solve it better" subtitle="Use these steps in the next retest.">
            {(state.aiReview?.solve_steps?.length ? state.aiReview.solve_steps : activeCard.guidance || []).map((step) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepDot} />
                <Text style={styles.stepCopy}>{step}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard title="Other weak topics" subtitle="Switch to another weak topic from the same report.">
            {state.cards.map((card) => {
              const selected = activeCard?.concept_id === card.concept_id;
              return (
                <Pressable
                  key={`${card.concept_id}-${card.topic}`}
                  style={[styles.topicRow, selected ? styles.topicRowActive : null]}
                  onPress={() =>
                    router.replace({
                      pathname: "/(student)/learn",
                      params: { conceptId: String(card.concept_id) },
                    })
                  }
                >
                  <View style={styles.topicCopy}>
                    <Text style={styles.topicTitle}>{card.topic}</Text>
                    <Text style={styles.topicMeta}>{card.chapter || state.report?.subject_name}</Text>
                  </View>
                  <Text style={styles.topicMiss}>{card.misses} misses</Text>
                </Pressable>
              );
            })}
          </SectionCard>

          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={() => router.push("/(student)/report")}>
              <Text style={styles.secondaryButtonText}>Back to report</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={async () => {
                await setSelectedFlow(state.report.exam, state.report.subject);
                router.push("/(student)/diagnostics");
              }}
            >
              <Text style={styles.primaryButtonText}>Start retest</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <SectionCard title="No weak-topic mapping found" subtitle="This report does not have guided concept content yet.">
          <Text style={styles.bodyText}>Try another report after the next exam attempt.</Text>
        </SectionCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topicHero: {
    gap: 4,
    paddingHorizontal: 2,
  },
  topicHeroEyebrow: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  topicHeroTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  topicHeroMeta: {
    color: colors.slate,
    fontSize: 13,
  },
  headline: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  summary: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  inlineMeta: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inlineMetaCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  inlineMetaLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  inlineMetaValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  bodyText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    marginTop: 6,
    backgroundColor: colors.accent,
  },
  stepCopy: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
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
  topicRowActive: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingHorizontal: 10,
  },
  topicCopy: {
    flex: 1,
  },
  topicTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  topicMeta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 4,
  },
  topicMiss: {
    color: colors.accentStrong,
    fontWeight: "900",
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
