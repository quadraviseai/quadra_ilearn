import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import {
  clearSelectedExamAttemptState,
  fetchActiveAttempt,
  fetchAttemptDetail,
  fetchEligibility,
  fetchExams,
  fetchSubjects,
  getSelectedFlow,
  resetAttemptTimer,
  saveAnswer,
  setSelectedFlow,
  startAttempt,
  submitAttempt,
  unlockRetest,
} from "../../src/lib/studentFlow";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

const TIMER_STORAGE_PREFIX = "quadrailearn-mobile-attempt-timer:";
const brandLogo = require("../../assets/quadravise-logo.png");

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

export default function StudentDiagnosticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundedDuringAttemptRef = useRef(false);
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
  const presetExamId = params.examId ? String(params.examId) : "";
  const presetSubjectId = params.subjectId ? String(params.subjectId) : "";
  const forceSetup = params.setup === "1";

  const clearAttemptUi = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setState((current) => ({
      ...current,
      attempt: null,
      questions: [],
      answers: {},
      currentIndex: 0,
      saving: false,
      submitting: false,
      timerSeconds: null,
      expired: false,
      resettingTimer: false,
    }));
  }, []);

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
        return { ...current, timerSeconds: next, expired: next === 0 };
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
        exams.find((exam) => String(exam.id) === presetExamId)
        || exams.find((exam) => String(exam.id) === String(selection.examId))
        || exams.find((exam) => [profile.primary_target_exam, profile.secondary_target_exam].filter(Boolean).includes(exam.name))
        || exams[0]
        || null;
      const subjects = selectedExam?.id ? await fetchSubjects(selectedExam.id) : [];
      const selectedSubject =
        subjects.find((subject) => String(subject.id) === presetSubjectId)
        || subjects.find((subject) => String(subject.id) === String(selection.subjectId))
        || subjects[0]
        || null;

      let eligibility = null;
      let activeAttemptLoaded = false;
      if (selectedSubject?.id && selectedExam?.id) {
        eligibility = await fetchEligibility(selectedExam.id, selectedSubject.id);
        const activeAttempt = await fetchActiveAttempt(selectedExam.id, selectedSubject.id);
        if (activeAttempt?.id && !forceSetup) {
          activeAttemptLoaded = true;
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
        attempt: activeAttemptLoaded ? current.attempt : null,
        questions: activeAttemptLoaded ? current.questions : [],
        answers: activeAttemptLoaded ? current.answers : {},
        currentIndex: activeAttemptLoaded ? current.currentIndex : 0,
        saving: false,
        submitting: false,
        timerSeconds: activeAttemptLoaded ? current.timerSeconds : null,
        expired: false,
        resettingTimer: false,
        error: "",
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message, exams: [], subjects: [] }));
    }
  }, [forceSetup, loadAttemptDetail, presetExamId, presetSubjectId]);

  useEffect(() => {
    load();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      const hasActiveAttempt = Boolean(state.attempt?.id) && !state.submitting;

      if (hasActiveAttempt && (nextState === "background" || nextState === "inactive")) {
        backgroundedDuringAttemptRef.current = true;
      }

      if (
        backgroundedDuringAttemptRef.current
        && previousState.match(/inactive|background/)
        && nextState === "active"
        && hasActiveAttempt
      ) {
        backgroundedDuringAttemptRef.current = false;
        Alert.alert(
          "Test resumed",
          "You switched away from the app during an active mock test. The timer continued running while the app was in the background.",
        );
      }

      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [state.attempt?.id, state.submitting]);

  const selectedExam = state.exams.find((item) => String(item.id) === state.selectedExamId) || null;
  const selectedSubject = state.subjects.find((item) => String(item.id) === state.selectedSubjectId) || null;
  const currentQuestion = state.questions?.[state.currentIndex] || null;
  const totalQuestions = state.questions?.length || 0;
  const isLastQuestion = totalQuestions > 0 && state.currentIndex === totalQuestions - 1;
  const answeredCount = useMemo(
    () => Object.values(state.answers).filter((answer) => Boolean(answer.selected_option_id || answer.answer_text?.trim())).length,
    [state.answers],
  );
  const paymentRequired = Boolean(state.eligibility?.payment_required);
  const payableAmount = Number(state.eligibility?.amount || 0);
  const isCompact = width < 390;
  const isNarrow = width < 360;
  const gutter = isNarrow ? 14 : isCompact ? 16 : 24;
  const titleSize = isNarrow ? 24 : isCompact ? 27 : 30;
  const brandSize = isNarrow ? 19 : isCompact ? 21 : 24;

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
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
      setState((current) => ({ ...current, error: error.message, subjects: [], selectedSubjectId: "", eligibility: null }));
    }
  };

  const handleSubjectChange = async (subjectId) => {
    const eligibility = state.selectedExamId && subjectId ? await fetchEligibility(state.selectedExamId, subjectId) : null;
    setState((current) => ({
      ...current,
      selectedSubjectId: String(subjectId || ""),
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

  const startFlow = async (shouldUnlock = false) => {
    if (!state.selectedExamId || !state.selectedSubjectId) {
      setState((current) => ({ ...current, error: "Choose the exam and subject first." }));
      return;
    }
    try {
      setState((current) => ({ ...current, starting: true, error: "" }));
      if (shouldUnlock) {
        await unlockRetest(state.selectedExamId, state.selectedSubjectId);
      }
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
      const message = String(error.message || "");
      if (message.includes("no longer active")) {
        await clearSelectedExamAttemptState();
        clearAttemptUi();
        await load();
        return;
      }
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
    await persistAnswer({ question_id: questionId, selected_option_id: optionId, answer_text: "", time_spent_seconds: 0 });
  };

  const submitExamFlow = async () => {
    if (!state.attempt?.id) {
      return;
    }
    try {
      setState((current) => ({ ...current, submitting: true, error: "" }));
      const attemptId = state.attempt.id;
      const report = await submitAttempt(attemptId);
      await clearStoredEndsAt(attemptId);
      await clearSelectedExamAttemptState();
      clearAttemptUi();
      router.replace({ pathname: "/(student)/report", params: { reportId: String(report.id) } });
    } catch (error) {
      const message = String(error.message || "");
      if (message.includes("no longer active")) {
        await clearSelectedExamAttemptState();
        clearAttemptUi();
        await load();
        return;
      }
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

  const handleExitAttempt = async () => {
    const examId = state.selectedExamId || String(state.attempt?.exam || "");
    const subjectId = state.selectedSubjectId || String(state.attempt?.subject || "");
    clearAttemptUi();
    router.replace({
      pathname: "/(student)/diagnostics",
      params: {
        examId,
        subjectId,
        setup: "1",
      },
    });
  };

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0} horizontalPadding={0}>
      <View style={[styles.header, { paddingHorizontal: gutter, paddingTop: insets.top + 10 }]}>
        <View style={[styles.topRow, isCompact && styles.topRowCompact]}>
          <View style={styles.brand}>
            <Image source={brandLogo} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.brandText, { fontSize: brandSize }]} numberOfLines={1}>QuadraILearn</Text>
          </View>
          <Pressable style={styles.logout} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
        <View style={[styles.progress, isCompact && styles.progressCompact]}>
          <Text style={[styles.progressItem, styles.progressActive, isCompact && styles.progressItemCompact]}>Select exam</Text>
          <Ionicons name="arrow-forward-outline" size={16} color="#8aa4cb" />
          <Text style={[styles.progressItem, isCompact && styles.progressItemCompact]}>Take mock test</Text>
          <Ionicons name="arrow-forward-outline" size={16} color="#8aa4cb" />
          <Text style={[styles.progressItem, isCompact && styles.progressItemCompact]}>Review</Text>
        </View>
        <View style={[styles.progressBar, { width: isNarrow ? 90 : isCompact ? 106 : 124, marginLeft: isNarrow ? 18 : 22 }]} />
      </View>

      {state.error ? <Text style={[styles.error, { paddingHorizontal: gutter }]}>{state.error}</Text> : null}

      {!state.attempt ? (
        <View style={[styles.body, { paddingHorizontal: gutter }]}>
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>Choose your mock test</Text>
          <Text style={styles.subtitle}>Pick the exam first, then the mapped subject.</Text>

          <Pressable style={styles.bigCard} onPress={() => setSelectionSheet({ type: "exam", open: true })}>
            <View style={[styles.badge, styles.badgeOrange]}><Ionicons name="school-outline" size={20} color={colors.white} /></View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Choose exam</Text>
              <Text style={styles.cardMeta}>
                {selectedExam ? `${selectedExam.subject_count} mapped subjects available` : "Select your target exam first"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.brandBlue} />
          </Pressable>

          <View style={styles.connector} />

          <Pressable
            style={[styles.bigCard, (!state.selectedExamId || !state.subjects.length) && styles.disabled]}
            onPress={() => setSelectionSheet({ type: "subject", open: true })}
            disabled={!state.selectedExamId || !state.subjects.length}
          >
            <View style={[styles.badge, styles.badgeBlue]}><Ionicons name="school-outline" size={18} color={colors.brandBlue} /></View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Choose subject</Text>
              <Text style={styles.cardMeta}>
                {selectedSubject ? `${selectedSubject.question_count} active questions ready` : "Pick one of the mapped subjects"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.brandBlue} />
          </Pressable>

          {state.eligibility ? (
            <View style={styles.payCard}>
              <Text style={styles.payTitle}>{state.eligibility.message}</Text>
              <Text style={styles.payMeta}>
                {state.eligibility.question_limit} questions | {paymentRequired ? `Pay Rs. ${payableAmount}` : "Ready to start"}
              </Text>
              <View style={styles.payBox}>
                {paymentRequired ? <Text style={styles.payAmount}>Pay Rs. {payableAmount.toFixed(2)}</Text> : null}
                <Pressable
                  style={[styles.startBtn, (!state.selectedExamId || !state.selectedSubjectId || state.starting) && styles.disabled]}
                  disabled={!state.selectedExamId || !state.selectedSubjectId || state.starting}
                  onPress={() => startFlow(paymentRequired && !state.eligibility?.resume)}
                >
                  <Text style={styles.startText}>
                    {state.starting ? "Opening..." : state.eligibility?.resume ? "Resume Mock Test" : "Start Mock Test"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.body, { paddingHorizontal: gutter }]}>
          <View style={[styles.testBar, isCompact && styles.testBarCompact]}>
            <View><Text style={styles.k}>Question</Text><Text style={styles.v}>{state.currentIndex + 1}/{totalQuestions}</Text></View>
            <View><Text style={styles.k}>Answered</Text><Text style={styles.v}>{answeredCount}</Text></View>
            <View><Text style={styles.k}>Tokens</Text><Text style={styles.v}>{state.tokenBalance}</Text></View>
            <View><Text style={styles.k}>Time left</Text><Text style={[styles.v, state.expired && styles.danger]}>{formatTime(state.timerSeconds)}</Text></View>
          </View>
          <Pressable style={styles.exitAttemptLink} onPress={handleExitAttempt}>
            <Ionicons name="close-circle-outline" size={16} color={colors.inkSoft} />
            <Text style={styles.exitAttemptText}>Back to exam selection</Text>
          </Pressable>

          {state.expired ? (
            <SectionCard title="Time is up" subtitle="Use tokens to reset the timer or submit and move to the result page." tone="accent">
              <Text style={styles.helper}>Resetting the timer uses {state.timerResetCost} tokens.</Text>
              <View style={[styles.actions, isCompact && styles.actionsCompact]}>
                <Pressable style={[styles.secondaryBtn, isCompact && styles.actionButtonCompact]} onPress={submitExamFlow}><Text style={styles.secondaryBtnText}>View result</Text></Pressable>
                <Pressable style={[styles.inlineBtn, isCompact && styles.actionButtonCompact, state.resettingTimer && styles.disabled]} disabled={state.resettingTimer} onPress={handleTimerReset}>
                  <Text style={styles.inlineBtnText}>{state.resettingTimer ? "Unlocking..." : `Use ${state.timerResetCost} tokens`}</Text>
                </Pressable>
              </View>
            </SectionCard>
          ) : (
            <SectionCard title={state.attempt.exam_name} subtitle={`${state.attempt.subject_name} mock test`}>
              <Text style={styles.qn}>Question {currentQuestion?.display_order || state.currentIndex + 1}</Text>
              <Text style={styles.qt}>{currentQuestion?.prompt}</Text>
              {currentQuestion?.options?.length ? (
                <View style={styles.opts}>
                  {currentQuestion.options.map((option) => {
                    const selected = state.answers[currentQuestion.id]?.selected_option_id === option.id;
                    return (
                      <Pressable key={option.id} style={[styles.opt, selected && styles.optActive]} onPress={() => selectOption(currentQuestion.id, option.id)}>
                        <Text style={[styles.optText, selected && styles.optTextActive]}>{option.option_text}</Text>
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
              <View style={[styles.actions, isCompact && styles.actionsCompact]}>
                <Pressable style={[styles.secondaryBtn, isCompact && styles.actionButtonCompact, state.currentIndex === 0 && styles.disabled]} disabled={state.currentIndex === 0} onPress={() => setState((current) => ({ ...current, currentIndex: Math.max(current.currentIndex - 1, 0) }))}>
                  <Text style={styles.secondaryBtnText}>Previous</Text>
                </Pressable>
                {isLastQuestion ? (
                  <Pressable style={[styles.inlineBtn, isCompact && styles.actionButtonCompact, state.submitting && styles.disabled]} disabled={state.submitting} onPress={submitExamFlow}>
                    <Text style={styles.inlineBtnText}>{state.submitting ? "Submitting..." : "Submit exam"}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.inlineBtn, isCompact && styles.actionButtonCompact]} onPress={() => setState((current) => ({ ...current, currentIndex: Math.min(current.currentIndex + 1, totalQuestions - 1) }))}>
                    <Text style={styles.inlineBtnText}>Next</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.saveHint}>{state.saving ? "Saving answer..." : "Answers save as you go."}</Text>
            </SectionCard>
          )}
        </View>
      )}

      <Modal visible={selectionSheet.open} transparent animationType="fade" onRequestClose={() => setSelectionSheet({ type: "", open: false })}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectionSheet({ type: "", open: false })} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{selectionSheet.type === "exam" ? "Choose exam" : "Choose subject"}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetList}>
              {(selectionSheet.type === "exam" ? state.exams : state.subjects).map((item) => {
                const selected = selectionSheet.type === "exam" ? String(item.id) === state.selectedExamId : String(item.id) === state.selectedSubjectId;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.sheetOption, selected && styles.sheetOptionActive]}
                    onPress={async () => {
                      if (selectionSheet.type === "exam") {
                        await handleExamChange(String(item.id));
                      } else {
                        await handleSubjectChange(String(item.id));
                      }
                      setSelectionSheet({ type: "", open: false });
                    }}
                  >
                    <View style={styles.sheetCopy}>
                      <Text style={[styles.sheetItemTitle, selected && styles.sheetItemTitleActive]}>{item.name}</Text>
                      <Text style={styles.sheetMeta}>{selectionSheet.type === "exam" ? `${item.subject_count} subjects` : `${item.question_count} active questions`}</Text>
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
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, backgroundColor: "#f9fbfe", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  topRowCompact: { alignItems: "flex-start", flexWrap: "wrap" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logo: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft },
  brandText: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  logout: { minHeight: 48, paddingHorizontal: 22, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", ...shadows.card },
  logoutText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  progress: { marginTop: 18, minHeight: 66, borderRadius: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, ...shadows.card },
  progressCompact: { paddingHorizontal: 16, minHeight: 58 },
  progressItem: { color: colors.inkSoft, fontSize: 13, fontWeight: "700", flexShrink: 1 },
  progressItemCompact: { fontSize: 12 },
  progressActive: { color: colors.ink, fontWeight: "900" },
  progressBar: { width: 136, height: 5, borderRadius: radii.pill, backgroundColor: colors.brandBlue, marginTop: -5, marginLeft: 36 },
  body: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 28, gap: 18 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "900" },
  subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  bigCard: { minHeight: 112, borderRadius: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 16, ...shadows.card },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  badgeOrange: { backgroundColor: "#ef8332" },
  badgeBlue: { backgroundColor: "#edf3fb" },
  badgeText: { color: colors.white, fontSize: 18, fontWeight: "900" },
  connector: { width: 2, height: 18, marginLeft: 50, marginTop: -10, marginBottom: -10, backgroundColor: "#cfe0f5" },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.ink, fontSize: 19, lineHeight: 24, fontWeight: "900" },
  cardMeta: { color: colors.inkSoft, fontSize: 14, lineHeight: 21 },
  payCard: { borderRadius: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, padding: 22, gap: 10, ...shadows.card },
  payTitle: { color: colors.ink, fontSize: 17, lineHeight: 28, fontWeight: "900" },
  payMeta: { color: colors.inkSoft, fontSize: 14, lineHeight: 22 },
  payBox: { marginTop: 6, borderRadius: 24, backgroundColor: colors.surface, padding: 14, gap: 14 },
  payAmount: { color: colors.ink, fontSize: 18, textAlign: "center", fontWeight: "900" },
  startBtn: { minHeight: 56, borderRadius: radii.pill, backgroundColor: colors.brandBlue, alignItems: "center", justifyContent: "center", ...shadows.glow },
  startText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  testBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radii.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft },
  testBarCompact: { flexWrap: "wrap", rowGap: 12, columnGap: 18 },
  k: { color: colors.slate, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  v: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 4 },
  danger: { color: colors.danger },
  qn: { color: colors.accentStrong, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  qt: { color: colors.ink, fontSize: 19, lineHeight: 26, fontWeight: "900" },
  opts: { gap: spacing.sm },
  opt: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.white },
  optActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentGlow },
  optText: { color: colors.ink, fontSize: 14 },
  optTextActive: { color: colors.accentStrong, fontWeight: "800" },
  input: { minHeight: 120, textAlignVertical: "top", padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.white, color: colors.ink },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionsCompact: { flexWrap: "wrap" },
  actionButtonCompact: { minWidth: "100%" },
  inlineBtn: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  inlineBtnText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  secondaryBtn: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  helper: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  saveHint: { color: colors.slate, fontSize: 12, textAlign: "center" },
  exitAttemptLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end" },
  exitAttemptText: { color: colors.inkSoft, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  error: { color: colors.danger, fontSize: 13, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(16, 25, 40, 0.28)", justifyContent: "center", paddingHorizontal: spacing.lg },
  sheet: { maxHeight: "68%", backgroundColor: colors.white, borderRadius: 28, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md, ...shadows.card },
  handle: { display: "none" },
  sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  sheetList: { gap: spacing.sm, paddingBottom: spacing.md },
  sheetOption: { minHeight: 64, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: "#fffaf6", paddingHorizontal: spacing.md, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  sheetOptionActive: { borderColor: "rgba(251, 100, 4, 0.28)", backgroundColor: "#fff3e8" },
  sheetCopy: { flex: 1, gap: 3 },
  sheetItemTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  sheetItemTitleActive: { color: colors.accentStrong },
  sheetMeta: { color: colors.slate, fontSize: 12, lineHeight: 18 },
});
