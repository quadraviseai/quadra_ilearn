import { useCallback, useEffect, useMemo, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

function getInitials(name) {
  return String(name || "S")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getHealthTone(score) {
  if (score >= 75) {
    return { color: colors.success, label: "Strong" };
  }
  if (score >= 50) {
    return { color: colors.gold, label: "Building" };
  }
  return { color: colors.coral, label: "Needs focus" };
}

function getRelativeAttemptLabel(attempt, index) {
  if (!attempt?.started_at) {
    return index === 0 ? "Completed recently" : `Completed ${index + 1} sessions ago`;
  }

  const startDate = new Date(attempt.started_at);
  const today = new Date();
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((todayDay - startDay) / 86400000);

  if (diffDays <= 0) {
    return "Completed today";
  }
  if (diffDays === 1) {
    return "Completed yesterday";
  }
  return `Completed ${diffDays} days ago`;
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [state, setState] = useState({
    loading: true,
    data: null,
    subjects: [],
    error: "",
    diagnosticError: "",
    selectedExamId: "",
    selectedSubjectId: "",
  });

  const loadDashboard = useCallback(async () => {
    try {
      const [data, subjects] = await Promise.all([
        apiRequest("/api/students/dashboard-summary"),
        apiRequest("/api/diagnostic/subjects"),
      ]);

      setState((current) => {
        const nextSubjectId = current.selectedSubjectId || String(subjects[0]?.id || "");
        const activeSubject =
          subjects.find((subject) => String(subject.id) === nextSubjectId) || subjects[0] || null;
        const nextExam =
          activeSubject?.exams?.find((exam) => exam.name === data?.primary_target_exam)
          || activeSubject?.exams?.find((exam) => exam.name === data?.secondary_target_exam)
          || activeSubject?.exams?.[0]
          || null;

        return {
          ...current,
          loading: false,
          data,
          subjects,
          error: "",
          diagnosticError: "",
          selectedSubjectId: nextSubjectId,
          selectedExamId: current.selectedExamId || String(nextExam?.id || ""),
        };
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        data: null,
        subjects: [],
        error: error.message,
        diagnosticError: "",
        selectedExamId: "",
        selectedSubjectId: "",
      }));
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const data = state.data;
  const latestHealth = data?.latest_learning_health;
  const weakConcepts = data?.weak_concepts || [];
  const recentAttempts = data?.recent_attempts || [];
  const selectedSubject = state.subjects.find((subject) => String(subject.id) === state.selectedSubjectId) || null;
  const examOptions = selectedSubject?.exams || [];
  const selectedExam = examOptions.find((exam) => String(exam.id) === state.selectedExamId) || null;

  const healthScore = Number(latestHealth?.health_score) || 0;
  const coverageScore = Number(latestHealth?.coverage_score) || 0;
  const healthTone = getHealthTone(healthScore);
  const currentStreak = data?.streak?.current_streak_days ?? 0;
  const primaryExam = data?.primary_target_exam || "Target not set";
  const recommendedSubject = selectedSubject?.name || state.subjects[0]?.name || "Mathematics";
  const recommendedTopic = weakConcepts[0]?.concept_name || "Core concept practice";

  const weeklyBars = useMemo(() => {
    const fallbackDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const attempts = [...recentAttempts].slice(0, 5).reverse();

    return fallbackDays.map((day, index) => {
      const score = Number(attempts[index]?.score_percent);
      return {
        day,
        value: Number.isFinite(score) ? Math.max(12, Math.min(score, 100)) : 18 + index * 12,
      };
    });
  }, [recentAttempts]);

  const handleOpenDiagnostic = () => {
    if (!state.selectedSubjectId || !state.selectedExamId) {
      setState((current) => ({
        ...current,
        diagnosticError: "Choose both subject and exam before starting.",
      }));
      return;
    }

    router.push({
      pathname: "/(student)/diagnostics",
      params: {
        subject_id: state.selectedSubjectId,
        exam: selectedExam?.name || data?.primary_target_exam || data?.secondary_target_exam || "",
      },
    });
  };

  return (
    <Screen loading={state.loading} refreshControl={loadDashboard}>
      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(data?.full_name)}</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Hello, {data?.full_name || "Student"}</Text>
            <Text style={styles.headerMeta}>
              {data?.class_name ? `Class ${data.class_name}` : "Class pending"}
              {data?.board ? ` | ${data.board}` : ""}
            </Text>
            <Text style={styles.headerTarget}>Target: {primaryExam}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.streakPill}>
            <Text style={styles.streakValue}>{currentStreak} days</Text>
            <Text style={styles.streakLabel}>Study streak</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <SectionCard
        title="Learning health"
        subtitle="Your most important academic signals in one place."
        tone="accent"
      >
        <View style={styles.healthCard}>
          <View style={styles.healthMain}>
            <View style={styles.healthMainHead}>
              <View>
                <Text style={styles.healthLabel}>Concept mastery</Text>
                <Text style={styles.healthValue}>{healthScore || "--"}%</Text>
              </View>
              <View style={[styles.healthBadge, { backgroundColor: `${healthTone.color}18` }]}>
                <Text style={[styles.healthBadgeText, { color: healthTone.color }]}>{healthTone.label}</Text>
              </View>
            </View>

            <View style={styles.metricBlock}>
              <View style={styles.metricRow}>
                <Text style={styles.metricTitle}>Concept Mastery</Text>
                <Text style={styles.metricValue}>{healthScore}%</Text>
              </View>
              <View style={styles.metricTrack}>
                <View
                  style={[
                    styles.metricFill,
                    { width: `${Math.max(8, Math.min(healthScore, 100))}%`, backgroundColor: healthTone.color },
                  ]}
                />
              </View>
            </View>

            <View style={styles.metricBlock}>
              <View style={styles.metricRow}>
                <Text style={styles.metricTitle}>Coverage</Text>
                <Text style={styles.metricValue}>{coverageScore}%</Text>
              </View>
              <View style={styles.metricTrack}>
                <View
                  style={[
                    styles.metricFill,
                    { width: `${Math.max(8, Math.min(coverageScore, 100))}%`, backgroundColor: colors.brandBlue },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.healthSummaryRow}>
            <View style={styles.healthSummaryCard}>
              <Text style={styles.healthSummaryLabel}>Coverage</Text>
              <Text style={styles.healthSummaryValue}>{coverageScore}%</Text>
            </View>
            <View style={styles.healthSummaryCard}>
              <Text style={styles.healthSummaryLabel}>Weak concepts</Text>
              <Text style={styles.healthSummaryValue}>{weakConcepts.length}</Text>
            </View>
            <View style={styles.healthSummaryCard}>
              <Text style={styles.healthSummaryLabel}>Current streak</Text>
              <Text style={styles.healthSummaryValue}>{currentStreak}</Text>
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="Recommended diagnostic"
        subtitle="Your clearest next study move for today."
        tone="accent"
      >
        <LinearGradient
          colors={["#fff4ea", "#ffffff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.diagnosticCard}
        >
          <View style={styles.diagnosticHead}>
            <Text style={styles.diagnosticEyebrow}>Recommended next</Text>
            <Text style={styles.diagnosticSubject}>{recommendedSubject}</Text>
            <Text style={styles.diagnosticTopic}>Topic: {recommendedTopic}</Text>
            <Text style={styles.diagnosticTime}>Estimated time: 12 min</Text>
          </View>

          {state.subjects.length ? (
            <View style={styles.selectionRow}>
              <View style={styles.pickerShell}>
                <Text style={styles.pickerLabel}>Subject</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={state.selectedSubjectId}
                    onValueChange={(value) => {
                      const nextSubject = state.subjects.find((subject) => String(subject.id) === String(value));
                      const nextExam =
                        nextSubject?.exams?.find((exam) => exam.name === data?.primary_target_exam)
                        || nextSubject?.exams?.find((exam) => exam.name === data?.secondary_target_exam)
                        || nextSubject?.exams?.[0]
                        || null;

                      setState((current) => ({
                        ...current,
                        selectedSubjectId: String(value),
                        selectedExamId: String(nextExam?.id || ""),
                        diagnosticError: "",
                      }));
                    }}
                    style={styles.picker}
                    dropdownIconColor={colors.slate}
                  >
                    {state.subjects.map((subject) => (
                      <Picker.Item
                        key={subject.id}
                        label={`${subject.name} (${subject.question_count})`}
                        value={String(subject.id)}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.pickerShell, styles.examPickerShell]}>
                <Text style={styles.pickerLabel}>Exam</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={state.selectedExamId}
                    onValueChange={(value) =>
                      setState((current) => ({
                        ...current,
                        selectedExamId: String(value),
                        diagnosticError: "",
                      }))
                    }
                    style={styles.picker}
                    enabled={Boolean(examOptions.length)}
                    dropdownIconColor={colors.slate}
                  >
                    {examOptions.length ? (
                      examOptions.map((exam) => (
                        <Picker.Item key={exam.id} label={exam.name} value={String(exam.id)} />
                      ))
                    ) : (
                      <Picker.Item label="No exam" value="" />
                    )}
                  </Picker>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No subjects are available yet.</Text>
          )}

          {state.diagnosticError ? <Text style={styles.error}>{state.diagnosticError}</Text> : null}

          <Pressable
            style={[
              styles.primaryButton,
              (!state.selectedSubjectId || !state.selectedExamId) ? styles.buttonDisabled : null,
            ]}
            disabled={!state.selectedSubjectId || !state.selectedExamId}
            onPress={handleOpenDiagnostic}
          >
            <Text style={styles.primaryButtonText}>Start diagnostic</Text>
          </Pressable>
        </LinearGradient>
      </SectionCard>

      <SectionCard
        title="Weak concepts"
        subtitle="The concepts that need attention first."
      >
        {weakConcepts.length ? (
          weakConcepts.slice(0, 3).map((item) => (
            <View key={`${item.subject_name}-${item.concept_name}`} style={styles.focusRow}>
              <View style={styles.focusRowLeft}>
                <View style={styles.focusAccent} />
                <View style={styles.focusCopy}>
                  <Text style={styles.rowTitle}>{item.concept_name}</Text>
                  <Text style={styles.rowMeta}>{item.subject_name}</Text>
                </View>
              </View>
              <View style={styles.focusScorePill}>
                <Text style={styles.focusScoreText}>{item.mastery_score}%</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No weak concepts yet.</Text>
        )}

        <Pressable style={styles.secondaryButton} onPress={() => router.push("/(student)/study-plan")}>
          <Text style={styles.secondaryButtonText}>Practice weak concepts</Text>
        </Pressable>
      </SectionCard>

      <SectionCard
        title="Your learning this week"
        subtitle="A quick visual of your recent effort and performance."
      >
        <View style={styles.chartCard}>
          <View style={styles.chartBars}>
            {weeklyBars.map((bar) => (
              <View key={bar.day} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <LinearGradient
                    colors={["#ffb47a", "#fb6404"]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={[styles.chartBar, { height: `${bar.value}%` }]}
                  />
                </View>
                <Text style={styles.chartLabel}>{bar.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="Recent activity"
        subtitle="Your latest diagnostics and practice outcomes."
      >
        {recentAttempts.length ? (
          recentAttempts.slice(0, 3).map((attempt, index) => (
            <View key={attempt.id} style={styles.listRow}>
              <View style={[styles.listAccent, styles.listAccentBlue]} />
              <View style={styles.activityCopy}>
                <Text style={styles.rowTitle}>{attempt.subject_name} Diagnostic</Text>
                <Text style={styles.rowMeta}>Score: {attempt.score_percent ?? "--"}%</Text>
                <Text style={styles.activityTime}>{getRelativeAttemptLabel(attempt, index)}</Text>
              </View>
              <Text style={styles.rowValue}>{attempt.score_percent ?? "--"}%</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No completed attempts yet.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: 2,
    paddingBottom: spacing.xs,
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.accentStrong,
    fontSize: 16,
    fontWeight: "900",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
  },
  headerMeta: {
    color: colors.slate,
    fontSize: 12,
  },
  headerTarget: {
    color: colors.brandBlue,
    fontSize: 12,
    fontWeight: "800",
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  streakPill: {
    minWidth: 82,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: "rgba(242, 178, 71, 0.22)",
    alignItems: "center",
  },
  streakValue: {
    color: "#9a6207",
    fontSize: 14,
    fontWeight: "900",
  },
  streakLabel: {
    color: "#9a6207",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  logoutButton: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
  },
  logoutText: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: 12,
  },
  healthCard: {
    gap: spacing.md,
  },
  healthMain: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  healthMainHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  healthLabel: {
    color: colors.accentStrong,
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  healthValue: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    marginTop: 6,
  },
  healthBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  metricBlock: {
    gap: 8,
    marginTop: 12,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metricTitle: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  metricTrack: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16, 62, 111, 0.08)",
    overflow: "hidden",
  },
  metricFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  healthSummaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  healthSummaryCard: {
    flex: 1,
    minHeight: 88,
    justifyContent: "space-between",
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
  },
  healthSummaryLabel: {
    color: colors.slate,
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: "800",
    lineHeight: 13,
  },
  healthSummaryValue: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 10,
  },
  diagnosticCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(251, 100, 4, 0.12)",
    gap: spacing.md,
  },
  diagnosticHead: {
    gap: 4,
  },
  diagnosticEyebrow: {
    color: colors.accentStrong,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  diagnosticSubject: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  diagnosticTopic: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  diagnosticTime: {
    color: colors.slate,
    fontSize: 12,
  },
  selectionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pickerShell: {
    flex: 1,
    gap: 8,
  },
  examPickerShell: {
    flex: 0.48,
  },
  pickerLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  pickerWrap: {
    minHeight: 52,
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  picker: {
    color: colors.ink,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.accent,
    ...shadows.glow,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  focusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  focusRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  focusAccent: {
    width: 12,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.coral,
  },
  focusCopy: {
    flex: 1,
  },
  focusScorePill: {
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  focusScoreText: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 62, 111, 0.12)",
    backgroundColor: "#ffffff",
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  chartCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: 144,
  },
  chartColumn: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  chartTrack: {
    width: "100%",
    height: 108,
    justifyContent: "flex-end",
    borderRadius: radii.md,
    backgroundColor: "rgba(16, 62, 111, 0.06)",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    minHeight: 14,
    borderRadius: radii.md,
  },
  chartLabel: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: "700",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  listAccent: {
    width: 10,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  listAccentBlue: {
    backgroundColor: colors.brandBlue,
  },
  activityCopy: {
    flex: 1,
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  rowMeta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 4,
  },
  activityTime: {
    color: colors.slateSoft,
    fontSize: 11,
    marginTop: 4,
  },
  rowValue: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "900",
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
