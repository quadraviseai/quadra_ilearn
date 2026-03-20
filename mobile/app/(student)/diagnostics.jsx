import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import {
  fetchActiveAttempt,
  fetchAttemptDetail,
  fetchExams,
  fetchEligibility,
  fetchSubjects,
  getSelectedFlow,
  resetAttemptTimer,
  saveAnswer,
  setSelectedFlow,
  startAttempt,
  submitAttempt,
} from "../../src/lib/studentFlow";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, spacing } from "../../src/theme";

const TIMER_STORAGE_PREFIX = "quadrailearn-mobile-attempt-timer:";

function buildAnswerMap(questions) {
  const answers = {};
  questions.forEach((question) => {
    answers[question.id] = {
      question_id: question.id,
      selected_option_id: question.existing_answer?.selected_option_id ?? "",
      answer_text: question.existing_answer?.answer_text ?? "",
      time_spent_seconds: question.existing_answer?.time_spent_seconds ?? 0,
    };
  });
  return answers;
}

function getTimerKey(attemptId) {
  return `${TIMER_STORAGE_PREFIX}${attemptId}`;
}

async function readStoredEndsAt(attemptId) {
  try {
    const raw = await AsyncStorage.getItem(getTimerKey(attemptId));
    const parsed = raw ? JSON.parse(raw) : null;
    return Number.isFinite(parsed?.endsAt) ? parsed.endsAt : null;
  } catch {
    return null;
  }
}

async function writeStoredEndsAt(attemptId, endsAt) {
  await AsyncStorage.setItem(getTimerKey(attemptId), JSON.stringify({ endsAt }));
}

async function clearStoredEndsAt(attemptId) {
  await AsyncStorage.removeItem(getTimerKey(attemptId));
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds || 0);
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function SelectionField({
  caption,
  value,
  placeholder,
  icon,
  iconColor,
  iconWrapStyle,
  onPress,
  disabled = false,
}) {
  return (
    <View style={styles.pickerGroup}>
      <Pressable style={[styles.selectShell, disabled ? styles.disabled : null]} onPress={onPress} disabled={disabled}>
        <View style={[styles.selectIconWrap, iconWrapStyle]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.selectContent}>
          <Text style={styles.selectCaption}>{caption}</Text>
          <Text style={[styles.selectValue, !value ? styles.selectPlaceholder : null]} numberOfLines={1}>
            {value || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.slate} />
      </Pressable>
    </View>
  );
}

export default function StudentDiagnosticsScreen() {
  const router = useRouter();
  const intervalRef = useRef(null);
  const [selectionSheet, setSelectionSheet] = useState({ type: "", open: false });
  const [state, setState] = useState({
    loading: true,
    exams: [],
    subjects: [],
    selectedSubjectId: "",
    selectedExamId: "",
    eligibility: null,
    error: "",
    starting: false,
    attempt: null,
    questions: [],
    answers: {},
    currentIndex: 0,
    saving: false,
    submitting: false,
    timerSeconds: null,
    tokenBalance: 0,
    timerResetCost: 0,
    expired: false,
    resettingTimer: false,
  });

  const loadAttemptDetail = useCallback(async (attemptId) => {
    const detail = await fetchAttemptDetail(attemptId);
    const questionCount = detail.questions?.length || 1;
    const defaultEndsAt = Date.now() + questionCount * 60 * 1000;
    const storedEndsAt = await readStoredEndsAt(attemptId);
    const endsAt = storedEndsAt ?? defaultEndsAt;
    if (!storedEndsAt) {
      await writeStoredEndsAt(attemptId, endsAt);
    }

    setState((current) => ({
      ...current,
      attempt: detail.attempt,
      questions: detail.questions || [],
      answers: buildAnswerMap(detail.questions || []),
      currentIndex: 0,
      tokenBalance: detail.token_balance ?? current.tokenBalance,
      timerResetCost: detail.token_settings?.timer_reset_cost ?? current.timerResetCost,
      timerSeconds: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
      expired: false,
      error: "",
    }));

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setState((current) => {
        const next = Math.max(0, current.timerSeconds == null ? 0 : current.timerSeconds - 1);
        return {
          ...current,
          timerSeconds: next,
          expired: next === 0,
        };
      });
    }, 1000);
  }, []);

  const load = useCallback(async () => {
    try {
      const [exams, profile, selection] = await Promise.all([
        fetchExams(),
        apiRequest("/api/students/profile"),
        getSelectedFlow(),
      ]);
      const selectedExam =
        exams.find((exam) => String(exam.id) === String(selection.examId))
        || exams.find((exam) => [profile.primary_target_exam, profile.secondary_target_exam].filter(Boolean).includes(exam.name))
        || exams[0]
        || null;
      const subjects = selectedExam?.id ? await fetchSubjects(selectedExam.id) : [];
      const selectedSubject =
        subjects.find((subject) => String(subject.id) === String(selection.subjectId))
        || subjects[0]
        || null;

      let eligibility = null;
      if (selectedSubject?.id && selectedExam?.id) {
        eligibility = await fetchEligibility(selectedExam.id, selectedSubject.id);
        const activeAttempt = await fetchActiveAttempt(selectedExam.id, selectedSubject.id);
        if (activeAttempt?.id) {
          await loadAttemptDetail(activeAttempt.id);
        }
      }

      setState((current) => ({
        ...current,
        loading: false,
        exams,
        subjects,
        selectedSubjectId: String(selectedSubject?.id || ""),
        selectedExamId: String(selectedExam?.id || ""),
        eligibility,
        tokenBalance: profile.token_balance || 0,
        error: "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        exams: [],
        subjects: [],
        error: error.message,
      }));
    }
  }, [loadAttemptDetail]);

  useEffect(() => {
    load();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [load]);

  const selectedExam = state.exams.find((item) => String(item.id) === state.selectedExamId) || null;
  const selectedSubject = state.subjects.find((item) => String(item.id) === state.selectedSubjectId) || null;
  const currentQuestion = state.questions?.[state.currentIndex] || null;
  const totalQuestions = state.questions?.length || 0;
  const isLastQuestion = totalQuestions > 0 && state.currentIndex === totalQuestions - 1;
  const answeredCount = useMemo(
    () =>
      Object.values(state.answers).filter((answer) => Boolean(answer.selected_option_id || answer.answer_text?.trim())).length,
    [state.answers],
  );

  const refreshSelection = async (examId, subjectId) => {
    const eligibility = subjectId && examId ? await fetchEligibility(examId, subjectId) : null;
    setState((current) => ({
      ...current,
      selectedSubjectId: String(subjectId || ""),
      selectedExamId: String(examId || ""),
      eligibility,
      attempt: null,
      questions: [],
      answers: {},
      currentIndex: 0,
      timerSeconds: null,
      expired: false,
      error: "",
    }));
  };

  const handleExamChange = async (examId) => {
    try {
      setState((current) => ({
        ...current,
        selectedExamId: String(examId || ""),
        selectedSubjectId: "",
        subjects: [],
        eligibility: null,
        attempt: null,
        questions: [],
        answers: {},
        currentIndex: 0,
        timerSeconds: null,
        expired: false,
        error: "",
      }));
      const subjects = examId ? await fetchSubjects(examId) : [];
      const nextSubject = subjects[0] || null;
      const eligibility = examId && nextSubject?.id ? await fetchEligibility(examId, nextSubject.id) : null;
      setState((current) => ({
        ...current,
        subjects,
        selectedExamId: String(examId || ""),
        selectedSubjectId: String(nextSubject?.id || ""),
        eligibility,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        subjects: [],
        selectedSubjectId: "",
        eligibility: null,
        error: error.message,
      }));
    }
  };

  const handleSubjectChange = async (subjectId) => {
    await refreshSelection(state.selectedExamId, String(subjectId));
  };

  const handleStartOrResume = async () => {
    if (!state.selectedSubjectId || !state.selectedExamId) {
      setState((current) => ({ ...current, error: "Choose the exam and subject first." }));
      return;
    }

    try {
      setState((current) => ({ ...current, starting: true, error: "" }));
      await setSelectedFlow(state.selectedExamId, state.selectedSubjectId);
      const activeAttempt = await fetchActiveAttempt(state.selectedExamId, state.selectedSubjectId);
      const attempt = activeAttempt || await startAttempt(state.selectedExamId, state.selectedSubjectId);
      await loadAttemptDetail(attempt.id);
      setState((current) => ({ ...current, starting: false }));
    } catch (error) {
      setState((current) => ({ ...current, starting: false, error: error.message }));
    }
  };

  const persistAnswer = async (payload) => {
    if (!state.attempt?.id || !payload?.question_id) {
      return;
    }
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      await saveAnswer(state.attempt.id, payload);
      setState((current) => ({ ...current, saving: false }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
    }
  };

  const selectOption = async (questionId, optionId) => {
    setState((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [questionId]: {
          ...current.answers[questionId],
          question_id: questionId,
          selected_option_id: optionId,
          answer_text: "",
          time_spent_seconds: 0,
        },
      },
    }));
    await persistAnswer({
      question_id: questionId,
      selected_option_id: optionId,
      answer_text: "",
      time_spent_seconds: 0,
    });
  };

  const submitExam = async () => {
    if (!state.attempt?.id) {
      return;
    }
    try {
      setState((current) => ({ ...current, submitting: true, error: "" }));
      const report = await submitAttempt(state.attempt.id);
      await clearStoredEndsAt(state.attempt.id);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      router.replace({ pathname: "/(student)/report", params: { reportId: String(report.id) } });
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error.message }));
    }
  };

  const handleTimerReset = async () => {
    if (!state.attempt?.id) {
      return;
    }
    try {
      setState((current) => ({ ...current, resettingTimer: true, error: "" }));
      const result = await resetAttemptTimer(state.attempt.id);
      const nextEndsAt = Date.now() + (result.reset_duration_seconds || Math.max(totalQuestions, 1) * 60) * 1000;
      await writeStoredEndsAt(state.attempt.id, nextEndsAt);
      setState((current) => ({
        ...current,
        resettingTimer: false,
        tokenBalance: result.token_balance ?? current.tokenBalance,
        timerSeconds: Math.max(0, Math.ceil((nextEndsAt - Date.now()) / 1000)),
        expired: false,
      }));
    } catch (error) {
      setState((current) => ({ ...current, resettingTimer: false, error: error.message }));
    }
  };

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0}>
      <AppHeader
        title="Exams"
        subtitle="Select exam  →  Take mock test  →  Submit  →  Review"
        fullBleed
      />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      {!state.attempt ? (
        <>
          <View style={styles.selectionSection}>
            <View style={styles.selectionSectionHead}>
              <Text style={styles.selectionSectionTitle}>Choose your mock test</Text>
              <Text style={styles.selectionSectionSubtitle}>Pick the exam first, then the mapped subject.</Text>
            </View>

            <View style={styles.selectionHero}>
              <View style={styles.selectionStep}>
                <View style={styles.selectionStepBadge}>
                  <Text style={styles.selectionStepBadgeText}>1</Text>
                </View>
                <View style={styles.selectionStepCopy}>
                  <Text style={styles.selectionStepTitle}>Choose exam</Text>
                  <Text style={styles.selectionStepMeta}>
                    {selectedExam ? `${selectedExam.subject_count} mapped subjects available` : "Select from admin-created exams"}
                  </Text>
                </View>
              </View>
              <Text style={styles.selectionArrow}>→</Text>
              <View style={styles.selectionStep}>
                <View style={[styles.selectionStepBadge, styles.selectionStepBadgeSoft]}>
                  <Text style={styles.selectionStepBadgeText}>2</Text>
                </View>
                <View style={styles.selectionStepCopy}>
                  <Text style={styles.selectionStepTitle}>Choose subject</Text>
                  <Text style={styles.selectionStepMeta}>
                    {selectedSubject ? `${selectedSubject.question_count} active questions ready` : "Subjects appear after exam selection"}
                  </Text>
                </View>
              </View>
            </View>

            <SelectionField
              caption="Select exam"
              value={selectedExam?.name || ""}
              placeholder="Choose exam"
              icon="school-outline"
              iconColor={colors.accentStrong}
              onPress={() => setSelectionSheet({ type: "exam", open: true })}
            />

            <SelectionField
              caption="Select subject"
              value={selectedSubject?.name || ""}
              placeholder={state.selectedExamId ? "Choose subject" : "Select exam first"}
              icon="library-outline"
              iconColor={colors.brandBlue}
              iconWrapStyle={styles.selectIconWrapBlue}
              onPress={() => setSelectionSheet({ type: "subject", open: true })}
              disabled={!state.selectedExamId || !state.subjects.length}
            />

            {state.eligibility ? (
              <View style={styles.eligibilityBand}>
                <Text style={styles.eligibilityTitle}>{state.eligibility.message}</Text>
                <Text style={styles.eligibilityMeta}>
                  {state.eligibility.question_limit} questions
                  {state.eligibility.payment_required ? ` | Pay Rs. ${state.eligibility.amount}` : " | Ready to start"}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryButton, (!state.selectedSubjectId || !state.selectedExamId || state.starting) ? styles.disabled : null]}
              disabled={!state.selectedSubjectId || !state.selectedExamId || state.starting}
              onPress={handleStartOrResume}
            >
              <Text style={styles.primaryButtonText}>
                {state.starting ? "Opening..." : state.eligibility?.resume ? "Resume mock test" : "Start mock test"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.testTopBar}>
            <View>
              <Text style={styles.topBarLabel}>Question</Text>
              <Text style={styles.topBarValue}>{state.currentIndex + 1}/{totalQuestions}</Text>
            </View>
            <View>
              <Text style={styles.topBarLabel}>Answered</Text>
              <Text style={styles.topBarValue}>{answeredCount}</Text>
            </View>
            <View>
              <Text style={styles.topBarLabel}>Tokens</Text>
              <Text style={styles.topBarValue}>{state.tokenBalance}</Text>
            </View>
            <View>
              <Text style={styles.topBarLabel}>Time left</Text>
              <Text style={[styles.topBarValue, state.expired ? styles.topBarDanger : null]}>{formatTime(state.timerSeconds)}</Text>
            </View>
          </View>

          {state.expired ? (
            <SectionCard title="Time is up" subtitle="Use tokens to reset the timer or submit and move to the result page." tone="accent">
              <Text style={styles.expiredText}>Resetting the timer uses {state.timerResetCost} tokens.</Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButton} onPress={submitExam}>
                  <Text style={styles.secondaryButtonText}>View result</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButtonInline, state.resettingTimer ? styles.disabled : null]}
                  disabled={state.resettingTimer}
                  onPress={handleTimerReset}
                >
                  <Text style={styles.primaryButtonText}>{state.resettingTimer ? "Unlocking..." : `Use ${state.timerResetCost} tokens`}</Text>
                </Pressable>
              </View>
            </SectionCard>
          ) : (
            <SectionCard title={state.attempt.exam_name} subtitle={`${state.attempt.subject_name} mock test`}>
              <Text style={styles.questionNumber}>Question {currentQuestion?.display_order || state.currentIndex + 1}</Text>
              <Text style={styles.questionTitle}>{currentQuestion?.prompt}</Text>

              {currentQuestion?.options?.length ? (
                <View style={styles.optionsWrap}>
                  {currentQuestion.options.map((option) => {
                    const selected = state.answers[currentQuestion.id]?.selected_option_id === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.optionRow, selected ? styles.optionRowActive : null]}
                        onPress={() => selectOption(currentQuestion.id, option.id)}
                      >
                        <Text style={[styles.optionText, selected ? styles.optionTextActive : null]}>{option.option_text}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Type your answer"
                  value={state.answers[currentQuestion?.id]?.answer_text || ""}
                  onChangeText={(value) =>
                    setState((current) => ({
                      ...current,
                      answers: {
                        ...current.answers,
                        [currentQuestion.id]: {
                          ...current.answers[currentQuestion.id],
                          question_id: currentQuestion.id,
                          answer_text: value,
                          selected_option_id: "",
                        },
                      },
                    }))
                  }
                  onBlur={() => persistAnswer(state.answers[currentQuestion.id])}
                  multiline
                />
              )}

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.secondaryButton, state.currentIndex === 0 ? styles.disabled : null]}
                  disabled={state.currentIndex === 0}
                  onPress={() => setState((current) => ({ ...current, currentIndex: Math.max(current.currentIndex - 1, 0) }))}
                >
                  <Text style={styles.secondaryButtonText}>Previous</Text>
                </Pressable>
                {isLastQuestion ? (
                  <Pressable style={[styles.primaryButtonInline, state.submitting ? styles.disabled : null]} disabled={state.submitting} onPress={submitExam}>
                    <Text style={styles.primaryButtonText}>{state.submitting ? "Submitting..." : "Submit exam"}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.primaryButtonInline}
                    onPress={() => setState((current) => ({ ...current, currentIndex: Math.min(current.currentIndex + 1, totalQuestions - 1) }))}
                  >
                    <Text style={styles.primaryButtonText}>Next</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.savingHint}>{state.saving ? "Saving answer..." : "Answers save as you go."}</Text>
            </SectionCard>
          )}
        </>
      )}

      <Modal
        visible={selectionSheet.open}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectionSheet({ type: "", open: false })}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectionSheet({ type: "", open: false })} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selectionSheet.type === "exam" ? "Choose exam" : "Choose subject"}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetList}>
              {(selectionSheet.type === "exam" ? state.exams : state.subjects).map((item) => {
                const selected =
                  selectionSheet.type === "exam"
                    ? String(item.id) === state.selectedExamId
                    : String(item.id) === state.selectedSubjectId;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.sheetOption, selected ? styles.sheetOptionActive : null]}
                    onPress={async () => {
                      if (selectionSheet.type === "exam") {
                        await handleExamChange(String(item.id));
                      } else {
                        await handleSubjectChange(String(item.id));
                      }
                      setSelectionSheet({ type: "", open: false });
                    }}
                  >
                    <View style={styles.sheetOptionCopy}>
                      <Text style={[styles.sheetOptionTitle, selected ? styles.sheetOptionTitleActive : null]}>{item.name}</Text>
                      <Text style={styles.sheetOptionMeta}>
                        {selectionSheet.type === "exam"
                          ? `${item.subject_count} subjects`
                          : `${item.question_count} active questions`}
                      </Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  selectionSection: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  selectionSectionHead: {
    gap: 4,
  },
  selectionSectionTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  selectionSectionSubtitle: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  selectionHero: {
    borderRadius: radii.lg,
    backgroundColor: "#fff6ee",
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(251, 100, 4, 0.08)",
  },
  selectionStep: {
    flex: 1,
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  selectionStepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  selectionStepBadgeSoft: {
    backgroundColor: colors.brandBlue,
  },
  selectionStepBadgeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  selectionStepCopy: {
    gap: 2,
  },
  selectionStepTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  selectionStepMeta: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 18,
  },
  selectionArrow: {
    alignSelf: "center",
    color: colors.accentStrong,
    fontSize: 20,
    fontWeight: "900",
    paddingHorizontal: 2,
  },
  pickerGroup: {
    gap: 8,
  },
  selectShell: {
    minHeight: 76,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(16, 62, 111, 0.08)",
    backgroundColor: "#fffaf6",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffe7d4",
  },
  selectIconWrapBlue: {
    backgroundColor: "#e8f2ff",
  },
  selectContent: {
    flex: 1,
    gap: 4,
  },
  selectCaption: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  selectValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  selectPlaceholder: {
    color: colors.slate,
    fontWeight: "700",
  },
  eligibilityBand: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.sectionAlt,
    gap: 4,
  },
  eligibilityTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  eligibilityMeta: {
    color: colors.slate,
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 50,
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
    fontSize: 14,
    fontWeight: "800",
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
    fontSize: 14,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.55,
  },
  testTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  topBarLabel: {
    color: colors.slate,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  topBarValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  topBarDanger: {
    color: colors.danger,
  },
  questionNumber: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  questionTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "900",
  },
  optionsWrap: {
    gap: spacing.sm,
  },
  optionRow: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
  },
  optionRowActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentGlow,
  },
  optionText: {
    color: colors.ink,
    fontSize: 14,
  },
  optionTextActive: {
    color: colors.accentStrong,
    fontWeight: "800",
  },
  input: {
    minHeight: 120,
    textAlignVertical: "top",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  expiredText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  savingHint: {
    color: colors.slate,
    fontSize: 12,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 25, 40, 0.28)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    maxHeight: "68%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: radii.pill,
    alignSelf: "center",
    backgroundColor: "rgba(16, 62, 111, 0.14)",
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  sheetList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetOption: {
    minHeight: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: "#fffaf6",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sheetOptionActive: {
    borderColor: "rgba(251, 100, 4, 0.28)",
    backgroundColor: "#fff3e8",
  },
  sheetOptionCopy: {
    flex: 1,
    gap: 3,
  },
  sheetOptionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  sheetOptionTitleActive: {
    color: colors.accentStrong,
  },
  sheetOptionMeta: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 18,
  },
});
