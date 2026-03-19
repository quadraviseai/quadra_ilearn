import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useLocalSearchParams } from "expo-router";
import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

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

export default function StudentDiagnosticsScreen() {
  const params = useLocalSearchParams();
  const [state, setState] = useState({
    loading: true,
    subjects: [],
    profileExamNames: [],
    selectedExamId: "",
    selectedSubjectId: "",
    starting: false,
    error: "",
    startedAttempt: null,
    attemptDetail: null,
    answers: {},
    currentQuestionIndex: 0,
    submitting: false,
    submitError: "",
    submitResult: null,
  });

  const loadSubjects = useCallback(async () => {
    try {
      const [subjects, profile] = await Promise.all([
        apiRequest("/api/diagnostic/subjects"),
        apiRequest("/api/students/profile"),
      ]);
      const profileExamNames = [profile.primary_target_exam, profile.secondary_target_exam].filter(Boolean);
      const preselectedSubject = String(params.subject_id || "");
      const preferredExamName = String(params.exam || "");
      const activeSubject =
        subjects.find((subject) => String(subject.id) === preselectedSubject) || subjects[0] || null;
      const preferredExam =
        activeSubject?.exams?.find((exam) => exam.name === preferredExamName)
        || activeSubject?.exams?.find((exam) => profileExamNames.includes(exam.name))
        || activeSubject?.exams?.[0]
        || null;

      setState((current) => ({
        ...current,
        loading: false,
        subjects,
        profileExamNames,
        selectedExamId: String(preferredExam?.id || current.selectedExamId || ""),
        selectedSubjectId: preselectedSubject || current.selectedSubjectId || String(subjects[0]?.id || ""),
        error: "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        subjects: [],
        profileExamNames: [],
        error: error.message,
      }));
    }
  }, [params.exam, params.subject_id]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const selectedSubject = state.subjects.find((subject) => String(subject.id) === state.selectedSubjectId);
  const examOptions = selectedSubject?.exams || [];
  const selectedExam = examOptions.find((exam) => String(exam.id) === state.selectedExamId);
  const questions = state.attemptDetail?.questions || [];
  const currentQuestion = questions[state.currentQuestionIndex] || null;
  const answeredCount = questions.filter((question) => {
    const answer = state.answers[question.id];
    return Boolean(answer?.selected_option_id || answer?.answer_text?.trim());
  }).length;
  const totalQuestions = questions.length;
  const isLastQuestion = totalQuestions > 0 && state.currentQuestionIndex === totalQuestions - 1;

  const startDiagnostic = async () => {
    if (!state.selectedExamId) {
      setState((current) => ({ ...current, error: "Choose an exam first." }));
      return;
    }
    if (!state.selectedSubjectId) {
      setState((current) => ({ ...current, error: "Choose a subject first." }));
      return;
    }

    try {
      setState((current) => ({
        ...current,
        starting: true,
        error: "",
        submitError: "",
        submitResult: null,
      }));
      const attempt = await apiRequest("/api/diagnostic/start", {
        method: "POST",
        body: { subject_id: state.selectedSubjectId, exam_id: state.selectedExamId },
      });
      const attemptDetail = await apiRequest(`/api/diagnostic/attempts/${attempt.id}`);
      setState((current) => ({
        ...current,
        starting: false,
        error: "",
        startedAttempt: attempt,
        attemptDetail,
        answers: buildAnswerMap(attemptDetail.questions || []),
        currentQuestionIndex: 0,
      }));
    } catch (error) {
      setState((current) => ({ ...current, starting: false, error: error.message }));
    }
  };

  const handleOptionSelect = (questionId, optionId) => {
    setState((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [questionId]: {
          ...current.answers[questionId],
          selected_option_id: optionId,
          answer_text: "",
        },
      },
    }));
  };

  const handleAnswerText = (questionId, value) => {
    setState((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [questionId]: {
          ...current.answers[questionId],
          answer_text: value,
          selected_option_id: "",
        },
      },
    }));
  };

  const handleSubmit = async () => {
    if (!state.startedAttempt?.id) {
      return;
    }

    try {
      setState((current) => ({ ...current, submitting: true, submitError: "" }));
      const result = await apiRequest(`/api/diagnostic/attempts/${state.startedAttempt.id}/submit`, {
        method: "POST",
        body: {
          answers: Object.values(state.answers).map((answer) => ({
            ...answer,
            selected_option_id: answer.selected_option_id || null,
            answer_text: answer.answer_text || "",
          })),
        },
      });
      setState((current) => ({
        ...current,
        submitting: false,
        submitError: "",
        submitResult: result,
      }));
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, submitError: error.message }));
    }
  };

  return (
    <Screen loading={state.loading} refreshControl={loadSubjects}>
      <AppHeader
        title="Diagnostic"
        subtitle="Choose the exam lens and subject before creating the next attempt."
      />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <SectionCard title="Exam" subtitle="Use the exam that matches the target you are currently preparing for." tone="accent">
        {examOptions.length ? (
          <View style={styles.choiceWrap}>
            {examOptions.map((exam) => {
              const isSelected = String(exam.id) === state.selectedExamId;
              return (
                <Pressable
                  key={exam.id}
                  style={[styles.choiceChip, isSelected ? styles.choiceChipActive : null]}
                  onPress={() => setState((current) => ({ ...current, selectedExamId: String(exam.id), error: "" }))}
                >
                  <Text style={[styles.choiceText, isSelected ? styles.choiceTextActive : null]}>{exam.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.meta}>This subject does not have exam-linked diagnostic questions yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Subject" subtitle="Select the subject you want this diagnostic to cover.">
        <View style={styles.subjectList}>
          {state.subjects.map((subject) => {
            const isSelected = String(subject.id) === state.selectedSubjectId;
            return (
              <Pressable
                key={subject.id}
                style={[styles.subjectRow, isSelected ? styles.subjectRowActive : null]}
                onPress={() => {
                  const nextExam =
                    subject.exams?.find((exam) => state.profileExamNames.includes(exam.name))
                    || subject.exams?.[0]
                    || null;
                  setState((current) => ({
                    ...current,
                    selectedSubjectId: String(subject.id),
                    selectedExamId: String(nextExam?.id || ""),
                    error: "",
                  }));
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.meta}>{subject.question_count} active questions</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.button, (!state.selectedExamId || !state.selectedSubjectId || state.starting) ? styles.buttonDisabled : null]}
          disabled={!state.selectedExamId || !state.selectedSubjectId || state.starting}
          onPress={startDiagnostic}
        >
          <Text style={styles.buttonText}>{state.starting ? "Starting..." : "Start diagnostic"}</Text>
        </Pressable>
      </SectionCard>

      {state.startedAttempt ? (
        <SectionCard title="Attempt" subtitle="Your exam-specific diagnostic is now active.">
          <Text style={styles.meta}>Exam: {state.startedAttempt.exam_name || selectedExam?.name || "Not set"}</Text>
          <Text style={styles.meta}>Subject: {state.startedAttempt.subject_name}</Text>
          <Text style={styles.meta}>Progress: {answeredCount}/{totalQuestions} answered</Text>
        </SectionCard>
      ) : null}

      {currentQuestion ? (
        <SectionCard title={`Question ${state.currentQuestionIndex + 1} of ${totalQuestions}`} subtitle={currentQuestion.concept_name || "General concept"} tone="accent">
          <Text style={styles.questionTitle}>{currentQuestion.prompt}</Text>

          {currentQuestion.options?.length ? (
            <View style={styles.optionsWrap}>
              {currentQuestion.options.map((option) => {
                const isSelected = state.answers[currentQuestion.id]?.selected_option_id === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.optionRow, isSelected ? styles.optionRowActive : null]}
                    onPress={() => handleOptionSelect(currentQuestion.id, option.id)}
                  >
                    <View style={[styles.optionDot, isSelected ? styles.optionDotActive : null]} />
                    <Text style={[styles.optionText, isSelected ? styles.optionTextActive : null]}>{option.option_text}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Type your answer"
              value={state.answers[currentQuestion.id]?.answer_text || ""}
              onChangeText={(value) => handleAnswerText(currentQuestion.id, value)}
            />
          )}

          <View style={styles.navRow}>
            <Pressable
              style={[styles.secondaryButton, state.currentQuestionIndex === 0 ? styles.buttonDisabled : null]}
              disabled={state.currentQuestionIndex === 0}
              onPress={() =>
                setState((current) => ({
                  ...current,
                  currentQuestionIndex: Math.max(current.currentQuestionIndex - 1, 0),
                }))
              }
            >
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </Pressable>

            {isLastQuestion ? (
              <Pressable
                style={[styles.button, state.submitting ? styles.buttonDisabled : null]}
                disabled={state.submitting}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>{state.submitting ? "Submitting..." : "Submit answers"}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.button}
                onPress={() =>
                  setState((current) => ({
                    ...current,
                    currentQuestionIndex: Math.min(current.currentQuestionIndex + 1, totalQuestions - 1),
                  }))
                }
              >
                <Text style={styles.buttonText}>Next</Text>
              </Pressable>
            )}
          </View>
        </SectionCard>
      ) : null}

      {state.submitError ? <Text style={styles.error}>{state.submitError}</Text> : null}

      {state.submitResult ? (
        <SectionCard title="Result" subtitle="Your latest performance snapshot is ready.">
          <View style={styles.resultRow}>
            <View style={styles.resultTile}>
              <Text style={styles.resultLabel}>Score</Text>
              <Text style={styles.resultValue}>{state.submitResult.attempt.score_percent}%</Text>
            </View>
            <View style={styles.resultTile}>
              <Text style={styles.resultLabel}>Health</Text>
              <Text style={styles.resultValue}>{state.submitResult.learning_health.health_score}</Text>
            </View>
            <View style={styles.resultTile}>
              <Text style={styles.resultLabel}>Streak</Text>
              <Text style={styles.resultValue}>{state.submitResult.streak.current_streak_days}d</Text>
            </View>
          </View>
        </SectionCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...shadows.card,
  },
  choiceChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(251, 100, 4, 0.28)",
  },
  choiceText: {
    color: colors.ink,
    fontWeight: "700",
  },
  choiceTextActive: {
    color: colors.accentStrong,
  },
  subjectList: {
    gap: spacing.sm,
  },
  subjectRow: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.card,
  },
  subjectRowActive: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(251, 100, 4, 0.28)",
  },
  subjectName: {
    color: colors.ink,
    fontWeight: "700",
  },
  meta: {
    color: colors.slate,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    ...shadows.card,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  questionTitle: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 17,
    lineHeight: 24,
  },
  optionsWrap: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  optionRowActive: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(251, 100, 4, 0.28)",
  },
  optionDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.slate,
    backgroundColor: "transparent",
  },
  optionDotActive: {
    borderColor: colors.accentStrong,
    backgroundColor: colors.accentStrong,
  },
  optionText: {
    color: colors.ink,
    flex: 1,
  },
  optionTextActive: {
    color: colors.accentStrong,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.ink,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  resultRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultTile: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(251, 100, 4, 0.18)",
    ...shadows.card,
  },
  resultLabel: {
    color: colors.slate,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resultValue: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 22,
    marginTop: 6,
  },
  error: {
    color: colors.danger,
  },
});
