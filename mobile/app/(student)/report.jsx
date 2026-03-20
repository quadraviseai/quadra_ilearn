import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import {
  fetchLatestReport,
  fetchLearning,
  fetchReport,
  fetchWeakTopicAIReview,
  setSelectedFlow,
} from "../../src/lib/studentFlow";
import { colors, radii, shadows, spacing } from "../../src/theme";

const brandLogo = require("../../assets/quadravise-logo.png");

function SummaryTile({ icon, iconColor, iconBg, label, value }) {
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value ?? "--"}</Text>
    </View>
  );
}

export default function StudentReportScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const scorePercent = useMemo(() => Math.round(Number(state.report?.score_percent || 0)), [state.report]);
  const learningCards = state.learning?.learning_cards || [];
  const weakTopicUnlockCost = state.learning?.weak_topic_unlock_cost || 0;
  const isCompact = width < 390;
  const isNarrow = width < 360;
  const gutter = isNarrow ? 14 : isCompact ? 16 : 24;
  const titleSize = isNarrow ? 26 : isCompact ? 29 : 32;
  const statValueSize = isNarrow ? 42 : isCompact ? 48 : 56;

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

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (!state.report && !state.loading) {
    return (
      <Screen refreshControl={load} topPadding={0} horizontalPadding={0}>
        <View style={[styles.header, { paddingHorizontal: gutter, paddingTop: insets.top + 10 }]}>
          <View style={[styles.topRow, isCompact && styles.topRowCompact]}>
            <View style={styles.brand}>
              <Image source={brandLogo} style={styles.logo} resizeMode="contain" />
              <Text style={styles.brandText}>QuadraILearn</Text>
            </View>
            <Pressable style={styles.logout} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.body, { paddingHorizontal: gutter }]}>
          {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
          <Text style={styles.title}>Result</Text>
          <Text style={styles.subtitle}>Finish a mock test first to generate your result page.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace("/(student)/diagnostics")}>
            <Text style={styles.primaryButtonText}>Go to exams</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0} horizontalPadding={0}>
      <View style={[styles.header, { paddingHorizontal: gutter, paddingTop: insets.top + 10 }]}>
        <View style={[styles.topRow, isCompact && styles.topRowCompact]}>
          <View style={styles.brand}>
            <Image source={brandLogo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandText}>QuadraILearn</Text>
          </View>
          <Pressable style={styles.logout} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

        <View style={[styles.body, { paddingHorizontal: gutter }]}>
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>Result</Text>
          <Text style={styles.subtitle}>Score, weak concepts and tokens from the latest submitted exam.</Text>

          <View style={[styles.statRow, isCompact && styles.statRowCompact]}>
            <View style={[styles.heroStatCard, styles.heroStatBlue]}>
              <Text style={styles.heroStatLabel}>Your score</Text>
              <Text style={[styles.heroStatValue, { fontSize: statValueSize, lineHeight: statValueSize + 2 }]}>{scorePercent}%</Text>
              <Text style={styles.heroStatMeta}>{state.report?.exam_name} | {state.report?.subject_name}</Text>
            </View>
            <View style={[styles.heroStatCard, styles.heroStatWarm]}>
              <Text style={[styles.heroStatLabel, styles.heroStatLabelWarm]}>Tokens</Text>
              <Text style={[styles.heroStatValue, styles.heroStatValueWarm, { fontSize: statValueSize, lineHeight: statValueSize + 2 }]}>{state.tokenBalance}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Result summary</Text>
            <Text style={styles.sectionSubtitle}>This is the outcome of your submitted mock test.</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryTileHalf}><SummaryTile icon="document-text-outline" iconColor={colors.brandBlue} iconBg="#e9f1fb" label="Questions" value={state.report?.total_questions} /></View>
              <View style={styles.summaryTileHalf}><SummaryTile icon="checkmark-circle" iconColor={colors.success} iconBg="#dff5ea" label="Correct" value={state.report?.correct_answers} /></View>
              <View style={styles.summaryTileHalf}><SummaryTile icon="close-circle" iconColor={colors.accent} iconBg="#ffe9dd" label="Wrong" value={state.report?.wrong_answers} /></View>
              <View style={styles.summaryTileHalf}><SummaryTile icon="ellipse-outline" iconColor="#4c98f2" iconBg="#e7f1ff" label="Unanswered" value={state.report?.unanswered_answers} /></View>
            </View>

            <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
              <Pressable
                style={[styles.secondaryButton, isCompact && styles.actionButtonCompact]}
                onPress={async () => {
                  await setSelectedFlow(state.report.exam, state.report.subject);
                  router.replace({
                    pathname: "/(student)/diagnostics",
                    params: {
                      examId: String(state.report.exam),
                      subjectId: String(state.report.subject),
                      setup: "1",
                    },
                  });
                }}
              >
                <Ionicons name="arrow-undo-outline" size={18} color={colors.brandBlue} />
                <Text style={styles.secondaryButtonText}>Retake Exam</Text>
              </Pressable>
              <Pressable style={[styles.orangeButton, isCompact && styles.actionButtonCompact]} onPress={() => router.push("/(student)/profile")}>
                <Ionicons name="wallet-outline" size={18} color={colors.white} />
                <Text style={styles.orangeButtonText}>View Tokens</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Weak concepts</Text>
            <Text style={styles.sectionSubtitle}>Generate AI-powered guidance for concepts you want to unlock.</Text>

            {learningCards.length ? (
              learningCards.map((card, index) => {
                const aiReview = state.aiReviews[card.concept_id];
                return (
                  <View key={`${card.concept_id}-${card.topic}`} style={[styles.weakBlock, index > 0 && styles.weakBlockBorder]}>
                    <View style={styles.weakHeader}>
                      <View style={styles.weakTitleRow}>
                        <Ionicons name="ribbon-outline" size={22} color={colors.accent} />
                        <Text style={styles.weakTitle}>{card.topic}</Text>
                      </View>
                      <Text style={styles.weakMisses}>{card.misses} misses</Text>
                    </View>

                    {!aiReview ? (
                      <>
                        <Pressable
                          style={[styles.aiButtonWrap, state.aiLoadingConceptId === card.concept_id && styles.disabled]}
                          disabled={state.aiLoadingConceptId === card.concept_id}
                          onPress={() => handleGenerateAI(card.concept_id)}
                        >
                          <View style={styles.aiButton}>
                            <Text style={styles.aiButtonText}>
                              {state.aiLoadingConceptId === card.concept_id ? "Generating..." : "Generate AI Tokens"}
                            </Text>
                            <View style={styles.aiCostWrap}>
                              <Ionicons name="wallet-outline" size={16} color="#ffcf58" />
                              <Text style={styles.aiCostText}>{card.token_cost || weakTopicUnlockCost || 15}</Text>
                            </View>
                          </View>
                        </Pressable>
                        <Text style={styles.helperText}>Spend tokens to unlock concept-specific guidance.</Text>
                      </>
                    ) : (
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
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.helperText}>No weak concepts were detected in this result.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#f9fbfe",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topRowCompact: {
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  brandText: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
  },
  logout: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  logoutText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 36,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 18,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 22,
    marginTop: -6,
  },
  statRow: {
    flexDirection: "row",
    gap: 14,
  },
  statRowCompact: {
    flexWrap: "wrap",
  },
  heroStatCard: {
    flex: 1,
    minHeight: 148,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 20,
    justifyContent: "space-between",
    ...shadows.card,
  },
  heroStatBlue: {
    backgroundColor: "#f6faff",
  },
  heroStatWarm: {
    backgroundColor: "#fff8f2",
  },
  heroStatLabel: {
    color: "#4a648c",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroStatLabelWarm: {
    color: colors.accentStrong,
  },
  heroStatValue: {
    color: colors.ink,
    fontSize: 56,
    lineHeight: 58,
    fontWeight: "900",
  },
  heroStatValueWarm: {
    color: colors.accentStrong,
  },
  heroStatMeta: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 30,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 22,
    gap: 18,
    ...shadows.card,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  summaryTileHalf: {
    flexBasis: "48%",
    maxWidth: "48%",
  },
  summaryTile: {
    minHeight: 126,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...shadows.card,
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    color: "#4f5f7f",
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "900",
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: "900",
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 14,
  },
  actionRowCompact: {
    flexWrap: "wrap",
  },
  actionButtonCompact: {
    minWidth: "100%",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  orangeButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...shadows.glow,
  },
  orangeButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  weakBlock: {
    gap: 14,
  },
  weakBlockBorder: {
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  weakHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  weakTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  weakTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    flexShrink: 1,
  },
  weakMisses: {
    color: colors.inkSoft,
    fontSize: 14,
  },
  aiButtonWrap: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 12,
  },
  aiButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    ...shadows.glow,
  },
  aiButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  aiCostWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  aiCostText: {
    color: "#ffcf58",
    fontSize: 14,
    fontWeight: "900",
  },
  helperText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  aiPanel: {
    gap: 8,
    padding: 16,
    borderRadius: 20,
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
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.55,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
