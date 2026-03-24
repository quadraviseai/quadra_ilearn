import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/Screen";
import {
  fetchLatestReport,
  fetchLearning,
  fetchReport,
  fetchWeakTopicAIReview,
  setSelectedFlow,
} from "../../src/lib/studentFlow";
import { colors, radii, shadows, spacing } from "../../src/theme";

function SummaryTile({ icon, iconColor, iconBg, label, value }) {
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value ?? "--"}</Text>
    </View>
  );
}

function getResultMessage(scorePercent) {
  if (scorePercent < 30) {
    return "Require attention";
  }
  if (scorePercent < 40) {
    return "Good start";
  }
  if (scorePercent < 50) {
    return "Good going";
  }
  if (scorePercent < 60) {
    return "One more step";
  }
  if (scorePercent <= 80) {
    return "Dream comes to true";
  }
  return "You are rock";
}

function getResultCaption(scorePercent) {
  if (scorePercent < 30) {
    return "Your result needs attention. Focus on basics and weak topics before the next test.";
  }
  if (scorePercent < 40) {
    return "You have started the journey. Build consistency and improve topic clarity.";
  }
  if (scorePercent < 50) {
    return "You are moving in the right direction. A better revision cycle can lift your score.";
  }
  if (scorePercent < 60) {
    return "You are close to the next level. One more strong push can improve your rank.";
  }
  if (scorePercent <= 80) {
    return "Your progress is becoming real. Keep practicing smartly to turn this into a strong result.";
  }
  return "This is an excellent result. Keep the momentum and sharpen the final few weak areas.";
}

export default function StudentReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reportId = params.reportId ? String(params.reportId) : "";
  const [showDetails, setShowDetails] = useState(false);
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
  const resultMessage = getResultMessage(scorePercent);
  const resultCaption = getResultCaption(scorePercent);
  const progressRatio = Math.max(0, Math.min(scorePercent, 100)) / 100;
  const ringProgressScale = progressRatio <= 0 ? 0 : Math.max(0.08, progressRatio);

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

  const handleFinish = async () => {
    if (!state.report) {
      router.replace("/(student)/diagnostics");
      return;
    }
    await setSelectedFlow(state.report.exam, state.report.subject);
    router.replace({
      pathname: "/(student)/diagnostics",
      params: {
        examId: String(state.report.exam),
        subjectId: String(state.report.subject),
        setup: "1",
      },
    });
  };

  if (!state.report && !state.loading) {
    return (
      <Screen refreshControl={load} topPadding={0} horizontalPadding={0}>
        <View style={styles.emptyWrap}>
          {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
          <Text style={styles.emptyTitle}>Result</Text>
          <Text style={styles.emptySubtitle}>Finish a mock test first to generate your result page.</Text>
          <Pressable style={styles.finishButton} onPress={() => router.replace("/(student)/diagnostics")}>
            <Text style={styles.finishButtonText}>Go to exams</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0} horizontalPadding={0} backgroundColor="#F7F9FC">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, !showDetails && styles.scrollContentCentered]}>
        <View style={[styles.body, !showDetails && styles.bodyCentered]}>
          {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

          <View style={styles.resultCard}>
            <View style={styles.sparkleOne} />
            <View style={styles.sparkleTwo} />
            <View style={styles.sparkleThree} />
            <View style={styles.ringWrap}>
              <View style={styles.ringOuter}>
                <View style={[styles.ringProgress, { opacity: progressRatio > 0 ? 1 : 0, transform: [{ scaleX: ringProgressScale }] }]} />
                <View style={styles.ringMiddle}>
                  <View style={styles.ringInner}>
                    <Text style={styles.resultPercent}>{scorePercent}%</Text>
                    <View style={styles.ringDivider} />
                    <Text style={styles.resultTitle}>{resultMessage}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.medalBadge}>
                <Ionicons name="ribbon" size={30} color="#F59E0B" />
              </View>
            </View>

            <Text style={styles.resultHeadingText}>{scorePercent}%</Text>
            <Text style={styles.resultCaption}>{resultCaption}</Text>

            <Pressable style={styles.finishButton} onPress={() => setShowDetails(true)}>
              <Text style={styles.finishButtonText}>View my weakness</Text>
            </Pressable>

            <Pressable style={styles.practiceLink} onPress={handleFinish}>
              <Text style={styles.practiceLinkText}>Practice again</Text>
            </Pressable>
          </View>

          {showDetails ? (
            <>
              <View style={styles.infoRow}>
                <View style={[styles.infoCard, styles.scoreCard]}>
                  <Text style={styles.infoLabel}>Your score</Text>
                  <Text style={styles.infoValue}>{scorePercent}%</Text>
                  <Text style={styles.infoMeta}>{state.report?.exam_name} | {state.report?.subject_name}</Text>
                </View>
                <View style={[styles.infoCard, styles.tokenCard]}>
                  <Text style={styles.infoLabel}>Tokens</Text>
                  <Text style={[styles.infoValue, styles.infoValueWarm]}>{state.tokenBalance}</Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Result summary</Text>
                <View style={styles.summaryGrid}>
                  <SummaryTile icon="document-text-outline" iconColor={colors.brandBlue} iconBg="#e9f1fb" label="Questions" value={state.report?.total_questions} />
                  <SummaryTile icon="checkmark-circle" iconColor={colors.success} iconBg="#dff5ea" label="Correct" value={state.report?.correct_answers} />
                  <SummaryTile icon="close-circle" iconColor={colors.accent} iconBg="#ffe9dd" label="Wrong" value={state.report?.wrong_answers} />
                  <SummaryTile icon="ellipse-outline" iconColor="#4c98f2" iconBg="#e7f1ff" label="Unanswered" value={state.report?.unanswered_answers} />
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={handleFinish}>
                    <Ionicons name="arrow-undo-outline" size={18} color={colors.brandBlue} />
                    <Text style={styles.secondaryButtonText}>Retake Exam</Text>
                  </Pressable>
                  <Pressable style={styles.orangeButton} onPress={() => router.push("/(student)/profile")}>
                    <Ionicons name="wallet-outline" size={18} color={colors.white} />
                    <Text style={styles.orangeButtonText}>View Tokens</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Weak concepts</Text>
                {learningCards.length ? (
                  learningCards.map((card, index) => {
                    const aiReview = state.aiReviews[card.concept_id];
                    return (
                      <View key={`${card.concept_id}-${card.topic}`} style={[styles.weakBlock, index > 0 && styles.weakBlockBorder]}>
                        <View style={styles.weakHeader}>
                          <View style={styles.weakTitleRow}>
                            <Ionicons name="ribbon-outline" size={20} color={colors.accent} />
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
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 36,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  body: {
    gap: 16,
  },
  bodyCentered: {
    alignItems: "center",
  },
  resultCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 18,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E9EEF7",
    ...shadows.card,
    overflow: "hidden",
  },
  sparkleOne: {
    position: "absolute",
    top: 54,
    left: 26,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F9C56B",
  },
  sparkleTwo: {
    position: "absolute",
    top: 82,
    right: 42,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FCD34D",
  },
  sparkleThree: {
    position: "absolute",
    top: 112,
    right: 24,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FDE68A",
  },
  ringWrap: {
    width: 210,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginBottom: 4,
  },
  ringOuter: {
    width: 194,
    height: 194,
    borderRadius: 97,
    backgroundColor: "#E7F0FB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 10,
    borderColor: "#D7E6F9",
    position: "relative",
  },
  ringProgress: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    height: 84,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderWidth: 10,
    borderBottomWidth: 0,
    borderColor: "#FF9F32",
  },
  ringMiddle: {
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  ringInner: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  medalBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFD166",
    borderWidth: 4,
    borderColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  resultPercent: {
    color: "#0F172A",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  resultTitle: {
    color: "#173A72",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  ringDivider: {
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#F9B54C",
    marginVertical: 8,
  },
  resultHeadingText: {
    color: "#1E3A6D",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: -2,
  },
  resultCaption: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 250,
  },
  finishButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#FF8D34",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#FF8D34",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  finishButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  practiceLink: {
    paddingTop: 4,
  },
  practiceLinkText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    ...shadows.card,
  },
  scoreCard: {
    backgroundColor: "#F8FBFF",
    borderColor: "#DCE9F8",
  },
  tokenCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#15356C",
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "800",
    marginTop: 8,
  },
  infoValueWarm: {
    color: "#C45105",
  },
  infoMeta: {
    color: "#577199",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    ...shadows.card,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  summaryTile: {
    width: "47.5%",
    minHeight: 148,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 14,
    gap: 10,
    ...shadows.card,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.brandBlue,
    fontSize: 14,
    fontWeight: "700",
  },
  orangeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
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
    fontWeight: "700",
  },
  weakBlock: {
    gap: 12,
    paddingTop: 4,
  },
  weakBlockBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: 16,
  },
  weakHeader: {
    flexDirection: "row",
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
    fontSize: 17,
    fontWeight: "700",
  },
  weakMisses: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
  },
  aiButtonWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  aiButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.brandBlue,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  aiButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  aiCostWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiCostText: {
    color: "#FFE08A",
    fontSize: 14,
    fontWeight: "800",
  },
  aiPanel: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#DCE9F8",
    padding: 14,
  },
  aiHeading: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  aiSubhead: {
    color: colors.brandBlue,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  aiText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  aiStep: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  helperText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 14,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.55,
  },
});
