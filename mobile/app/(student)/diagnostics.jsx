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
const diagnosticsArt = require("../../assets/dignostics.png");

function getExamPresentation(examName) {
  const value = String(examName || "").toLowerCase();
  if (value.includes("jee")) {
    return {
      image: require("../../assets/jeefinal.png"),
      accent: "#1D4ED8",
      description: "Engineering mock tests",
    };
  }
  if (value.includes("neet") || value.includes("medical") || value.includes("bio")) {
    return {
      image: require("../../assets/neet.png"),
      accent: "#15803D",
      description: "Medical entrance practice",
    };
  }
  return {
    image: require("../../assets/exam-generic.png"),
    accent: "#7C4A2D",
    description: "Boards and aptitude sets",
  };
}

function getExamCategory(examName) {
  const value = String(examName || "").toLowerCase();
  if (value.includes("jee") || value.includes("neet") || value.includes("cuet") || value.includes("gate")) {
    return "competitive";
  }
  if (value.includes("code") || value.includes("program") || value.includes("dsa")) {
    return "coding";
  }
  return "board";
}

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
  const upcomingScrollRef = useRef(null);
  const upcomingIndexRef = useRef(0);
  const upcomingDraggingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const backgroundedDuringAttemptRef = useRef(false);
  const [selectionSheet, setSelectionSheet] = useState({ type: "", open: false });
  const [startSheetVisible, setStartSheetVisible] = useState(false);
  const [examCategory, setExamCategory] = useState("all");
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
        || null;
      const subjects = selectedExam?.id ? await fetchSubjects(selectedExam.id) : [];
      const selectedSubject =
        subjects.find((subject) => String(subject.id) === presetSubjectId)
        || subjects.find((subject) => String(subject.id) === String(selection.subjectId))
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
  const upcomingExams = state.exams.filter((item) => String(item.id) !== state.selectedExamId);
  const slidingUpcomingExams = upcomingExams.length > 1 ? [...upcomingExams, ...upcomingExams] : upcomingExams;
  const filteredSetupExams = state.exams.filter((item) => examCategory === "all" || getExamCategory(item.name) === examCategory);
  const isLastMinute = Number(state.timerSeconds) <= 60;
  const isCompact = width < 390;
  const isNarrow = width < 360;
  const upcomingCardWidth = Math.min(Math.max(width * 0.56, 184), 230);
  const upcomingCardGap = 12;
  const gutter = isNarrow ? 14 : isCompact ? 16 : 24;
  const titleSize = isNarrow ? 24 : isCompact ? 27 : 30;
  const brandSize = isNarrow ? 19 : isCompact ? 21 : 24;

  useEffect(() => {
    upcomingIndexRef.current = 0;
    upcomingDraggingRef.current = false;
    upcomingScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [state.selectedExamId]);

  useEffect(() => {
    if (state.attempt?.id) {
      setStartSheetVisible(false);
    }
  }, [state.attempt?.id]);

  useEffect(() => {
    if (!selectedExam || upcomingExams.length < 2) {
      return undefined;
    }

    const stepWidth = upcomingCardWidth + upcomingCardGap;
    const sliderInterval = setInterval(() => {
      if (upcomingDraggingRef.current) {
        return;
      }
      upcomingIndexRef.current += 1;
      upcomingScrollRef.current?.scrollTo({
        x: upcomingIndexRef.current * stepWidth,
        animated: true,
      });

      if (upcomingIndexRef.current >= upcomingExams.length) {
        setTimeout(() => {
          upcomingIndexRef.current = 0;
          upcomingScrollRef.current?.scrollTo({ x: 0, animated: false });
        }, 360);
      }
    }, 2600);

    return () => clearInterval(sliderInterval);
  }, [selectedExam, upcomingExams, upcomingCardWidth]);

  const handleUpcomingScrollBegin = () => {
    upcomingDraggingRef.current = true;
  };

  const handleUpcomingScrollEnd = (event) => {
    const stepWidth = upcomingCardWidth + upcomingCardGap;
    const nextIndex = Math.round((event.nativeEvent.contentOffset.x || 0) / stepWidth);
    upcomingIndexRef.current = Math.max(0, Math.min(nextIndex, Math.max(slidingUpcomingExams.length - 1, 0)));

    if (upcomingIndexRef.current >= upcomingExams.length && upcomingExams.length > 0) {
      upcomingIndexRef.current = upcomingIndexRef.current % upcomingExams.length;
      upcomingScrollRef.current?.scrollTo({
        x: upcomingIndexRef.current * stepWidth,
        animated: false,
      });
    }

    setTimeout(() => {
      upcomingDraggingRef.current = false;
    }, 300);
  };

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
      setStartSheetVisible(false);
      const subjects = examId ? await fetchSubjects(examId) : [];
      setState((current) => ({
        ...current,
        subjects,
        selectedExamId: String(examId || ""),
        selectedSubjectId: "",
        eligibility: null,
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
    setStartSheetVisible(Boolean(subjectId && eligibility));
  };

  const startFlow = async (shouldUnlock = false) => {
    if (!state.selectedExamId || !state.selectedSubjectId) {
      setState((current) => ({ ...current, error: "Choose the exam and subject first." }));
      return;
    }
    try {
      setStartSheetVisible(false);
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
      setStartSheetVisible(true);
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
    <Screen loading={state.loading} refreshControl={load} topPadding={0} horizontalPadding={0} backgroundColor="#f4f7fb">
      {!state.attempt ? (
        <View pointerEvents="none" style={styles.setupBackdrop}>
          <View style={styles.setupGlowTop} />
          <View style={styles.setupGlowWarm} />
          <View style={styles.setupGlowBottom} />
        </View>
      ) : null}

      {!state.attempt ? (
        <View style={[styles.setupScreen, { paddingHorizontal: isNarrow ? 8 : isCompact ? 10 : 12, paddingTop: insets.top + 8 }]}>
          <View style={styles.setupPanel}>
            <View style={styles.setupIntro}>
              <View style={styles.setupTitleRow}>
                <Pressable style={styles.titleBackButton} onPress={selectedExam ? () => setState((current) => ({
                  ...current,
                  selectedExamId: "",
                  selectedSubjectId: "",
                  subjects: [],
                  eligibility: null,
                  error: "",
                })) : undefined} disabled={!selectedExam}>
                  <Ionicons name="arrow-back" size={20} color={selectedExam ? colors.brandBlueDeep : "#a8bdd8"} />
                </Pressable>
                <Text style={[styles.title, styles.titleSetup, { fontSize: titleSize, lineHeight: titleSize + 10 }]}>Choose your mock test</Text>
              </View>
            </View>

            <View style={[styles.setupStepper, isCompact && styles.setupStepperCompact]}>
              <View style={styles.stepperLine} />
              {selectedExam ? <View style={styles.stepperLineActiveMid} /> : null}
              <View style={styles.stepperItem}>
                <View style={[styles.stepperCircle, styles.stepperCircleActive]}>
                  <Text style={styles.stepperNumberCurrent}>1</Text>
                </View>
                <Text style={[styles.stepperLabel, !selectedExam && styles.stepperLabelActive]}>Select exam</Text>
              </View>
              <View style={styles.stepperItem}>
                <View style={[styles.stepperCircle, selectedExam && styles.stepperCircleCurrent]}>
                  <Text style={[styles.stepperNumber, selectedExam && styles.stepperNumberCurrent]}>2</Text>
                </View>
                <Text style={[styles.stepperLabel, selectedExam && styles.stepperLabelActive]}>Select subject</Text>
              </View>
            </View>

            {state.error ? <Text style={styles.errorSetup}>{state.error}</Text> : null}

            {!selectedExam ? (
              <View style={styles.setupSection}>
                <Text style={styles.setupSectionTitle}>Choose exam</Text>
                <Text style={styles.setupSectionMeta}>Select one exam to unlock its mapped subjects.</Text>
                <View style={styles.examTypeGroup}>
                  {[
                    { key: "all", label: "All" },
                    { key: "board", label: "Board" },
                    { key: "competitive", label: "Competitive" },
                    { key: "coding", label: "Coding" },
                  ].map((item) => {
                    const active = examCategory === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.examTypeChip, active && styles.examTypeChipActive]}
                        onPress={() => setExamCategory(item.key)}
                      >
                        <Text style={[styles.examTypeChipText, active && styles.examTypeChipTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.setupExamGrid}>
                  {filteredSetupExams.map((exam) => {
                    const presentation = getExamPresentation(exam.name);
                    const isSelected = String(exam.id) === state.selectedExamId;
                    return (
                      <Pressable
                        key={String(exam.id)}
                        style={[styles.examGridCard, isSelected && styles.examGridCardActive]}
                        onPress={() => handleExamChange(String(exam.id))}
                      >
                        <View style={styles.examGridImageWrap}>
                          <Image source={presentation.image} style={styles.examGridImage} resizeMode="cover" />
                        </View>
                        <View style={styles.examGridCopy}>
                          <Text style={styles.examGridTitle}>{exam.name}</Text>
                          <Text style={styles.examGridMeta}>
                            {Number(exam.subject_count || 0) > 0 ? `${exam.subject_count} subjects mapped` : presentation.description}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {!filteredSetupExams.length ? <Text style={styles.examTypeEmpty}>No exams available in this category.</Text> : null}
              </View>
            ) : null}

            {selectedExam ? (
              <View style={styles.setupSection}>
                <View style={styles.subjectGrid}>
                  {state.subjects.map((subject) => {
                    const isSelected = String(subject.id) === state.selectedSubjectId;
                    return (
                      <Pressable
                        key={String(subject.id)}
                        style={[styles.subjectGridCard, isSelected && styles.subjectGridCardActive]}
                        onPress={() => handleSubjectChange(String(subject.id))}
                      >
                        <View style={[styles.subjectGridIcon, isSelected && styles.subjectGridIconActive]}>
                          <Ionicons name="book-outline" size={20} color={isSelected ? colors.white : "#7fa0c8"} />
                        </View>
                        <Text style={[styles.subjectGridTitle, isSelected && styles.subjectGridTitleActive]}>{subject.name}</Text>
                        <Text style={styles.subjectGridMeta}>{`${subject.question_count} active questions`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {selectedExam && upcomingExams.length ? (
              <View style={styles.setupSection}>
                <Text style={styles.setupSectionTitle}>Upcoming exams</Text>
                <Text style={styles.setupSectionMeta}>Explore other exam tracks in the same card view.</Text>
                <ScrollView
                  ref={upcomingScrollRef}
                  horizontal
                  nestedScrollEnabled
                  directionalLockEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.upcomingSliderContent}
                  style={styles.upcomingSlider}
                  scrollEventThrottle={16}
                  onScrollBeginDrag={handleUpcomingScrollBegin}
                  onMomentumScrollEnd={handleUpcomingScrollEnd}
                  onScrollEndDrag={handleUpcomingScrollEnd}
                >
                  {slidingUpcomingExams.map((exam, index) => {
                    const presentation = getExamPresentation(exam.name);
                    return (
                      <Pressable
                        key={`upcoming-${String(exam.id)}-${index}`}
                        style={[styles.examGridCard, styles.upcomingSlideCard, { width: upcomingCardWidth, marginRight: upcomingCardGap }]}
                        onPress={() => handleExamChange(String(exam.id))}
                      >
                        <View style={styles.examGridImageWrap}>
                          <Image source={presentation.image} style={styles.examGridImage} resizeMode="cover" />
                        </View>
                        <View style={styles.examGridCopy}>
                          <Text style={styles.examGridTitle}>{exam.name}</Text>
                          <Text style={styles.examGridMeta}>
                            {Number(exam.subject_count || 0) > 0 ? `${exam.subject_count} subjects mapped` : presentation.description}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <Image source={diagnosticsArt} style={styles.setupArt} resizeMode="contain" />

          </View>
        </View>
      ) : (
        <>
          <View pointerEvents="none" style={styles.testBackdrop}>
            <View style={styles.testGlowTop} />
            <View style={styles.testGlowMid} />
            <View style={styles.testGlowBottom} />
          </View>

          {state.error ? <Text style={[styles.error, { paddingHorizontal: gutter }]}>{state.error}</Text> : null}

          <View style={[styles.body, { paddingHorizontal: gutter }]}>
          <View style={styles.testTopRow}>
            <Pressable style={styles.exitAttemptIconButton} onPress={handleExitAttempt}>
              <Ionicons name="arrow-back" size={18} color={colors.inkSoft} />
            </Pressable>
            <View style={styles.tokenPill}>
              <Ionicons name="diamond-outline" size={14} color={colors.inkSoft} />
              <Text style={styles.tokenPillText}>{state.tokenBalance}</Text>
            </View>
          </View>
          <View style={[styles.testBar, isCompact && styles.testBarCompact]}>
            <View style={styles.testBarItem}><Text style={styles.k}>Question</Text><Text style={styles.v}>{state.currentIndex + 1}/{totalQuestions}</Text></View>
            <View style={styles.testBarItem}><Text style={styles.k}>Answered</Text><Text style={styles.v}>{answeredCount}</Text></View>
            <View style={[styles.testBarItem, isLastMinute && styles.testBarItemWarn]}><Text style={styles.k}>Time left</Text><Text style={[styles.v, isLastMinute && styles.vWarn, state.expired && styles.danger]}>{formatTime(state.timerSeconds)}</Text></View>
          </View>

          <View style={styles.questionPanel}>
              <View style={styles.questionPanelHead}>
                <Text style={styles.questionExam}>{state.attempt.exam_name}</Text>
                <Text style={styles.questionSubject}>{`${state.attempt.subject_name} mock test`}</Text>
              </View>
              <View style={styles.questionBlock}>
                <Text style={styles.questionLabelPanel}>QUESTION {currentQuestion?.display_order || state.currentIndex + 1}</Text>
                <Text style={styles.questionTextPanel}>{currentQuestion?.prompt}</Text>
              </View>
              {currentQuestion?.options?.length ? (
                <View style={styles.optionsPanel}>
                  {currentQuestion.options.map((option, optionIndex) => {
                    const selected = state.answers[currentQuestion.id]?.selected_option_id === option.id;
                    const optionKey = String.fromCharCode(65 + optionIndex);
                    return (
                      <Pressable key={option.id} style={[styles.optionRow, selected && styles.optionRowActive, state.expired && styles.optionRowDisabled]} disabled={state.expired} onPress={() => selectOption(currentQuestion.id, option.id)}>
                        <View style={[styles.optionBullet, selected && styles.optionBulletActive]}>
                          <Text style={[styles.optionBulletText, selected && styles.optionBulletTextActive]}>{optionKey}</Text>
                        </View>
                        <Text style={[styles.optionRowText, selected && styles.optionRowTextActive]}>{option.option_text}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={[styles.input, state.expired && styles.inputDisabled]}
                  placeholder="Type your answer"
                  value={state.answers[currentQuestion?.id]?.answer_text || ""}
                  editable={!state.expired}
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
                <Pressable style={[styles.secondaryBtn, styles.panelSecondaryBtn, isCompact && styles.actionButtonCompact, state.currentIndex === 0 && styles.disabled, state.expired && styles.disabled]} disabled={state.currentIndex === 0 || state.expired} onPress={() => setState((current) => ({ ...current, currentIndex: Math.max(current.currentIndex - 1, 0) }))}>
                  <Text style={styles.panelSecondaryBtnText}>Previous</Text>
                </Pressable>
                {isLastQuestion ? (
                  <Pressable style={[styles.inlineBtn, styles.panelPrimaryBtn, isCompact && styles.actionButtonCompact, state.submitting && styles.disabled, state.expired && styles.disabled]} disabled={state.submitting || state.expired} onPress={submitExamFlow}>
                    <Text style={styles.inlineBtnText}>{state.submitting ? "Submitting..." : "Submit exam"}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.inlineBtn, styles.panelPrimaryBtn, isCompact && styles.actionButtonCompact, state.expired && styles.disabled]} disabled={state.expired} onPress={() => setState((current) => ({ ...current, currentIndex: Math.min(current.currentIndex + 1, totalQuestions - 1) }))}>
                    <Text style={styles.inlineBtnText}>Next</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.saveHint}>{state.saving ? "Saving answer..." : "Answers save as you go."}</Text>
            </View>
          </View>
        </>
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

      <Modal visible={startSheetVisible && Boolean(state.eligibility)} transparent animationType="fade" onRequestClose={() => setStartSheetVisible(false)}>
        <View style={styles.startSheetCenterOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStartSheetVisible(false)} />
          <View style={styles.startSheetCenter}>
            <View style={styles.startSheetHandle} />
            <Text style={styles.startSheetTitle}>{state.eligibility?.message || "Ready to start"}</Text>
            <Text style={styles.startSheetMeta}>
              {state.eligibility?.question_limit || 0} questions | {paymentRequired ? `Pay Rs. ${payableAmount.toFixed(2)}` : "Ready to start"}
            </Text>
            <Pressable
              style={[styles.setupInlineStart, (!state.selectedExamId || !state.selectedSubjectId || state.starting) && styles.disabled]}
              disabled={!state.selectedExamId || !state.selectedSubjectId || state.starting}
              onPress={() => startFlow(paymentRequired && !state.eligibility?.resume)}
            >
              <Text style={styles.setupInlineStartText}>{state.starting ? "Opening..." : state.eligibility?.resume ? "Resume Mock Test" : "Start Mock Test"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(state.expired && state.attempt?.id)} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.timeUpOverlay}>
          <View style={styles.timeUpSheet}>
            <View style={styles.startSheetHandle} />
            <Text style={styles.timeUpTitle}>Time is up</Text>
            <Text style={styles.timeUpMeta}>Use tokens to reset the timer or submit and move to the result page.</Text>
            <Text style={styles.timeUpHelper}>Resetting the timer uses {state.timerResetCost} tokens.</Text>
            <View style={[styles.actions, isCompact && styles.actionsCompact]}>
              <Pressable style={[styles.secondaryBtn, styles.timeUpSecondary, isCompact && styles.actionButtonCompact]} onPress={submitExamFlow}>
                <Text style={styles.secondaryBtnText}>View result</Text>
              </Pressable>
              <Pressable style={[styles.inlineBtn, styles.timeUpPrimary, isCompact && styles.actionButtonCompact, state.resettingTimer && styles.disabled]} disabled={state.resettingTimer} onPress={handleTimerReset}>
                <Text style={styles.inlineBtnText}>{state.resettingTimer ? "Unlocking..." : `Use ${state.timerResetCost} tokens`}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  setupBackdrop: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  setupGlowTop: { position: "absolute", top: -96, right: -72, width: 248, height: 248, borderRadius: 999, backgroundColor: "#dce9f8" },
  setupGlowWarm: { position: "absolute", top: 164, left: -86, width: 188, height: 188, borderRadius: 999, backgroundColor: "#f7e7de" },
  setupGlowBottom: { position: "absolute", bottom: -24, right: -74, width: 214, height: 214, borderRadius: 999, backgroundColor: "rgba(234, 244, 255, 0.96)" },
  testBackdrop: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  testGlowTop: { position: "absolute", top: -82, right: -68, width: 232, height: 232, borderRadius: 999, backgroundColor: "#dce9f8" },
  testGlowMid: { position: "absolute", top: 176, left: -92, width: 196, height: 196, borderRadius: 999, backgroundColor: "#f7e7de" },
  testGlowBottom: { position: "absolute", bottom: -56, right: -84, width: 224, height: 224, borderRadius: 999, backgroundColor: "rgba(234, 244, 255, 0.92)" },
  setupScreen: { paddingBottom: 36 },
  setupPanel: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, gap: 16 },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, backgroundColor: "#f9fbfe", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  topRowCompact: { alignItems: "flex-start", flexWrap: "wrap" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  brandCopy: { flex: 1, gap: 2 },
  logo: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft },
  logoSetup: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft },
  brandText: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  brandTextSetup: { color: "#0f2d65" },
  brandSubtext: { color: colors.inkSoft, fontSize: 13, lineHeight: 18, maxWidth: 190 },
  logout: { minHeight: 48, paddingHorizontal: 22, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", ...shadows.card },
  logoutAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: "rgba(156, 182, 214, 0.36)", alignItems: "center", justifyContent: "center", ...shadows.card },
  logoutText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  progress: { marginTop: 18, minHeight: 66, borderRadius: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, ...shadows.card },
  progressCompact: { paddingHorizontal: 16, minHeight: 58 },
  progressItem: { color: colors.inkSoft, fontSize: 13, fontWeight: "700", flexShrink: 1 },
  progressItemCompact: { fontSize: 12 },
  progressActive: { color: colors.ink, fontWeight: "900" },
  progressBar: { width: 136, height: 5, borderRadius: radii.pill, backgroundColor: colors.brandBlue, marginTop: -5, marginLeft: 36 },
  body: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 28, gap: 18 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "900" },
  titleSetup: { color: "#0f2d65", textAlign: "center", fontWeight: "700", letterSpacing: -0.3 },
  setupTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  titleBackButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  subtitle: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  subtitleSetup: { color: "#4a6591", fontSize: 15, lineHeight: 24, textAlign: "center", fontWeight: "500" },
  bigCard: { minHeight: 112, borderRadius: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 16, ...shadows.card },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  badgeOrange: { backgroundColor: "#ef8332" },
  badgeBlue: { backgroundColor: "#edf3fb" },
  badgeText: { color: colors.white, fontSize: 18, fontWeight: "900" },
  cardCopy: { flex: 1, gap: 4 },
  cardEyebrow: { color: colors.accentStrong, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  cardTitle: { color: colors.ink, fontSize: 19, lineHeight: 24, fontWeight: "900" },
  cardMeta: { color: colors.inkSoft, fontSize: 14, lineHeight: 21 },
  cardArrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(20, 87, 154, 0.08)", alignItems: "center", justifyContent: "center" },
  payCard: { borderRadius: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, padding: 22, gap: 10, ...shadows.card },
  payTitle: { color: colors.ink, fontSize: 17, lineHeight: 28, fontWeight: "900" },
  payMeta: { color: colors.inkSoft, fontSize: 14, lineHeight: 22 },
  payBox: { marginTop: 6, borderRadius: 24, backgroundColor: colors.surface, padding: 14, gap: 14 },
  payAmount: { color: colors.ink, fontSize: 18, textAlign: "center", fontWeight: "900" },
  startBtn: { minHeight: 56, borderRadius: radii.pill, backgroundColor: colors.brandBlue, alignItems: "center", justifyContent: "center", ...shadows.glow },
  startText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  setupStepper: { position: "relative", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 2, paddingHorizontal: 0 },
  setupStepperCompact: { paddingHorizontal: 4 },
  stepperLine: { position: "absolute", top: 19, left: "20%", right: "20%", height: 5, borderRadius: 999, backgroundColor: "#d7e4f4" },
  stepperLineActiveMid: { position: "absolute", top: 19, left: "20%", width: "60%", height: 5, borderRadius: 999, backgroundColor: colors.accent },
  stepperItem: { width: "44%", alignItems: "center", gap: 10 },
  stepperCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#dce8f6", borderWidth: 1, borderColor: "#c8d9ee", alignItems: "center", justifyContent: "center" },
  stepperCircleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepperCircleCurrent: { backgroundColor: colors.accent, borderColor: colors.accent, ...shadows.card },
  stepperNumber: { color: "#6f8fb6", fontSize: 18, fontWeight: "900" },
  stepperNumberCurrent: { color: colors.white },
  stepperLabel: { color: "#577199", fontSize: 13, lineHeight: 18, fontWeight: "500", textAlign: "center" },
  stepperLabelActive: { color: "#10336a", fontWeight: "700" },
  setupIntro: { paddingHorizontal: 0, gap: 10, marginTop: 4 },
  selectionCardDisabled: { opacity: 0.68 },
  cardTitleLarge: { color: "#15356c", fontSize: 22, lineHeight: 28, fontWeight: "900" },
  cardTitleSecondary: { color: "#5f79a2" },
  cardMetaLarge: { color: "#46648f", fontSize: 14, lineHeight: 22, fontWeight: "500" },
  setupSection: { gap: 12, paddingHorizontal: 0 },
  setupSectionTitle: { color: "#15356c", fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.2 },
  setupSectionMeta: { color: "#46648f", fontSize: 14, lineHeight: 22, fontWeight: "400" },
  examTypeGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 4, padding: 6, borderRadius: 999, backgroundColor: "#fff7f0", borderWidth: 1, borderColor: "rgba(251, 100, 4, 0.14)", alignSelf: "flex-start" },
  examTypeChip: { minHeight: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  examTypeChipActive: { backgroundColor: colors.accent, ...shadows.glow },
  examTypeChipText: { color: "#9a5c35", fontSize: 13, fontWeight: "600" },
  examTypeChipTextActive: { color: colors.white, fontWeight: "700" },
  examTypeEmpty: { color: "#577199", fontSize: 13, lineHeight: 18, textAlign: "center", marginTop: 4 },
  setupExamGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, columnGap: 10 },
  upcomingSlider: { marginRight: -12 },
  upcomingSliderContent: { paddingRight: 6 },
  upcomingSlideCard: { width: 204 },
  examGridCard: { width: "47.8%", backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#D7E0EA", padding: 10, ...shadows.card },
  examGridCardActive: { borderColor: "rgba(251, 100, 4, 0.36)", backgroundColor: "#FFF8F2" },
  examGridImageWrap: { width: "100%", height: 118, backgroundColor: "#E3EAF3", borderRadius: 18, overflow: "hidden" },
  examGridImage: { width: "100%", height: "100%" },
  examGridCopy: { paddingTop: 10, gap: 6 },
  examGridTitle: { color: "#0F172A", fontSize: 15, lineHeight: 20, fontWeight: "700" },
  examGridMeta: { color: "#64748B", fontSize: 12, lineHeight: 18, fontWeight: "400" },
  subjectGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, columnGap: 10 },
  subjectGridCard: { width: "47.8%", minHeight: 144, borderRadius: 24, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "rgba(20, 87, 154, 0.12)", padding: 14, alignItems: "flex-start", gap: 10, ...shadows.card },
  subjectGridCardActive: { borderColor: "rgba(251, 100, 4, 0.34)", backgroundColor: "#fff8f1" },
  subjectGridIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#f1f6fd", borderWidth: 1, borderColor: "rgba(20, 87, 154, 0.08)", alignItems: "center", justifyContent: "center" },
  subjectGridIconActive: { backgroundColor: colors.accent },
  subjectGridTitle: { color: "#244a80", fontSize: 17, lineHeight: 22, fontWeight: "700" },
  subjectGridTitleActive: { color: "#15356c" },
  subjectGridMeta: { color: "#44648f", fontSize: 13, lineHeight: 18, fontWeight: "500" },
  setupAvailability: { alignItems: "center", paddingTop: 10, paddingHorizontal: 14 },
  setupAvailabilityText: { color: "#344f7d", fontSize: 16, lineHeight: 24, fontWeight: "500", textAlign: "center" },
  setupAvailabilityStrong: { color: "#16366d", fontWeight: "900" },
  setupArt: { width: "100%", height: 180, marginTop: -18, marginBottom: -8 },
  setupInlineStart: { minHeight: 48, paddingHorizontal: 22, borderRadius: 999, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", ...shadows.glow },
  setupInlineStartText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  startSheetOverlay: { flex: 1, backgroundColor: "rgba(16, 25, 40, 0.24)", justifyContent: "flex-end" },
  startSheet: { backgroundColor: "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, alignItems: "center", gap: 10, ...shadows.card },
  startSheetCenterOverlay: { flex: 1, backgroundColor: "rgba(16, 25, 40, 0.24)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  startSheetCenter: { width: "100%", maxWidth: 360, backgroundColor: "#ffffff", borderRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, alignItems: "center", gap: 10, ...shadows.card },
  startSheetHandle: { width: 56, height: 5, borderRadius: 999, backgroundColor: "#d7e4f4", marginBottom: 6 },
  startSheetTitle: { color: "#15356c", fontSize: 25, lineHeight: 34, fontWeight: "800", textAlign: "center" },
  startSheetMeta: { color: "#46648f", fontSize: 14, lineHeight: 22, fontWeight: "500", textAlign: "center", marginBottom: 6 },
  timeUpOverlay: { flex: 1, backgroundColor: "rgba(16, 25, 40, 0.24)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  timeUpSheet: { backgroundColor: "#ffffff", borderRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 10, ...shadows.card },
  timeUpTitle: { color: "#15356c", fontSize: 28, lineHeight: 34, fontWeight: "800" },
  timeUpMeta: { color: "#46648f", fontSize: 14, lineHeight: 22, fontWeight: "500" },
  timeUpHelper: { color: "#15356c", fontSize: 15, lineHeight: 22, fontWeight: "600", marginTop: 2 },
  timeUpSecondary: { minHeight: 46, borderRadius: 16 },
  timeUpPrimary: { minHeight: 46, borderRadius: 16 },
  testBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accent, gap: 8, ...shadows.glow },
  testBarCompact: { flexWrap: "wrap", rowGap: 8, columnGap: 8 },
  testBarItem: { flex: 1, minHeight: 48, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  testBarItemWarn: { backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 1, borderColor: "rgba(255,255,255,0.44)", ...shadows.glow },
  k: { color: "rgba(255,255,255,0.82)", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  v: { color: colors.white, fontSize: 15, fontWeight: "800", marginTop: 3 },
  vWarn: { color: "#FFF7ED" },
  danger: { color: colors.danger },
  qn: { color: colors.accentStrong, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  qt: { color: colors.ink, fontSize: 19, lineHeight: 26, fontWeight: "900" },
  questionPanel: { paddingVertical: 6, gap: 14 },
  questionPanelHead: { gap: 2 },
  questionExam: { color: "#15356c", fontSize: 19, lineHeight: 24, fontWeight: "800" },
  questionSubject: { color: "#577199", fontSize: 13, lineHeight: 18, fontWeight: "500" },
  questionBlock: { gap: 8, paddingBottom: 2 },
  questionLabelPanel: { color: colors.accentStrong, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  questionTextPanel: { color: "#0F172A", fontSize: 17, lineHeight: 28, fontWeight: "700" },
  optionsPanel: { gap: 10 },
  optionRow: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  optionRowActive: { backgroundColor: "#EFF6FF", borderColor: "#1D4E89" },
  optionRowDisabled: { opacity: 0.82 },
  optionBullet: { width: 28, height: 28, borderRadius: 999, borderWidth: 1, borderColor: "#DBEAFE", alignItems: "center", justifyContent: "center", backgroundColor: "#EFF6FF" },
  optionBulletActive: { borderColor: "#1D4E89", backgroundColor: "#DBEAFE" },
  optionBulletText: { color: "#1D4E89", fontSize: 12, fontWeight: "800" },
  optionBulletTextActive: { color: "#1D4E89" },
  optionRowText: { flex: 1, color: "#0F172A", fontSize: 14, lineHeight: 20, fontWeight: "500" },
  optionRowTextActive: { fontWeight: "600" },
  opts: { gap: spacing.sm },
  opt: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.white },
  optActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentGlow },
  optText: { color: colors.ink, fontSize: 14 },
  optTextActive: { color: colors.accentStrong, fontWeight: "800" },
  input: { minHeight: 120, textAlignVertical: "top", padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.white, color: colors.ink },
  inputDisabled: { opacity: 0.82 },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionsCompact: { flexWrap: "wrap" },
  actionButtonCompact: { minWidth: "100%" },
  inlineBtn: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  inlineBtnText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  panelPrimaryBtn: { minHeight: 44, borderRadius: 16 },
  secondaryBtn: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  panelSecondaryBtn: { minHeight: 44, borderRadius: 16, backgroundColor: "#FFFFFF" },
  panelSecondaryBtnText: { color: "#8AA0BC", fontSize: 14, fontWeight: "700" },
  helper: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  saveHint: { color: colors.slate, fontSize: 12, textAlign: "center" },
  testTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exitAttemptLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end" },
  exitAttemptText: { color: colors.inkSoft, fontSize: 13, fontWeight: "700" },
  exitAttemptIconButton: { width: 30, height: 30, alignItems: "flex-start", justifyContent: "center", alignSelf: "flex-start" },
  tokenPill: { minHeight: 30, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(20, 87, 154, 0.10)", flexDirection: "row", alignItems: "center", gap: 6 },
  tokenPillText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  error: { color: colors.danger, fontSize: 13, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  errorSetup: { color: colors.danger, fontSize: 13, textAlign: "center", paddingHorizontal: 14 },
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
