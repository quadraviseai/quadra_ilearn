import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { getSelectedFlow, setSelectedFlow } from "../../src/lib/studentFlow";
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
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    subjects: [],
    selectedSubjectId: "",
    selectedExamId: "",
    error: "",
    starting: false,
    attempt: null,
    answers: {},
    currentIndex: 0,
    submitting: false,
    result: null,
  });

  const load = useCallback(async () => {
    try {
      const [subjects, profile, selection] = await Promise.all([
        apiRequest("/api/diagnostic/subjects"),
        apiRequest("/api/students/profile"),
        getSelectedFlow(),
      ]);
      const preferredExamNames = [profile.primary_target_exam, profile.secondary_target_exam].filter(Boolean);
      const selectedSubject =
        subjects.find((subject) => String(subject.id) === String(selection.subjectId)) || subjects[0] || null;
      const selectedExam =
        selectedSubject?.exams?.find((exam) => String(exam.id) === String(selection.examId))
        || selectedSubject?.exams?.find((exam) => preferredExamNames.includes(exam.name))
        || selectedSubject?.exams?.[0]
        || null;

      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        subjects,
        selectedSubjectId: String(selectedSubject?.id || ""),
        selectedExamId: String(selectedExam?.id || ""),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message,
        subjects: [],
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSubject = state.subjects.find((item) => String(item.id) === state.selectedSubjectId) || null;
  const examOptions = selectedSubject?.exams || [];
  const currentQuestion = state.attempt?.questions?.[state.currentIndex] || null;
  const totalQuestions = state.attempt?.questions?.length || 0;
  const isLastQuestion = totalQuestions > 0 && state.currentIndex === totalQuestions - 1;

  const answeredCount = useMemo(
    () =>
      Object.values(state.answers).filter((answer) => Boolean(answer.selected_option_id || answer.answer_text?.trim())).length,
    [state.answers],
  );

  const startDiagnostic = async () => {
    if (!state.selectedSubjectId || !state.selectedExamId) {
      setState((current) => ({ ...current, error: "Choose both subject and exam before starting." }));
      return;
    }

    try {
      setState((current) => ({ ...current, starting: true, error: "", result: null }));
      await setSelectedFlow(state.selectedExamId, state.selectedSubjectId);
      const attempt = await apiRequest("/api/diagnostic/attempts/start", {
        method: "POST",
        body: {
          exam_id: state.selectedExamId,
          subject_id: state.selectedSubjectId,
        },
      });
      const attemptDetail = await apiRequest(`/api/diagnostic/attempts/${attempt.id}`);
      setState((current) => ({
        ...current,
        starting: false,
        attempt: attemptDetail,
        answers: buildAnswerMap(attemptDetail.questions || []),
        currentIndex: 0,
      }));
    } catch (error) {
      setState((current) => ({ ...current, starting: false, error: error.message }));
    }
  };

  const updateOption = (questionId, optionId) => {
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

  const updateText = (questionId, value) => {
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

  const submit = async () => {
    if (!state.attempt?.id) {
      return;
    }
    try {
      setState((current) => ({ ...current, submitting: true, error: "" }));
      const result = await apiRequest(`/api/diagnostic/attempts/${state.attempt.id}/submit`, {
        method: "POST",
        body: {
          answers: Object.values(state.answers).map((answer) => ({
            ...answer,
            selected_option_id: answer.selected_option_id || null,
            answer_text: answer.answer_text || "",
          })),
        },
      });
      setState((current) => ({ ...current, submitting: false, result }));
    } catch (error) {
      setState((current) => ({ ...current, submitting: false, error: error.message }));
    }
  };

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader title="Diagnostic" subtitle="Choose the active subject and exam, then complete the full attempt from mobile." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      {!state.attempt ? (
        <>
          <SectionCard title="Subject and exam" subtitle="This selection is reused by report, learning, and payment sections.">
            <View style={styles.pickerGroup}>
              <Text style={styles.label}>Subject</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={state.selectedSubjectId}
                  onValueChange={(value) => {
                    const nextSubject = state.subjects.find((subject) => String(subject.id) === String(value));
                    const nextExam = nextSubject?.exams?.[0] || null;
                    setState((current) => ({
                      ...current,
                      selectedSubjectId: String(value),
                      selectedExamId: String(nextExam?.id || ""),
                      error: "",
                    }));
                  }}
                  style={styles.picker}
                >
                  {state.subjects.map((subject) => (
                    <Picker.Item key={subject.id} label={subject.name} value={String(subject.id)} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.label}>Exam</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={state.selectedExamId}
                  onValueChange={(value) => setState((current) => ({ ...current, selectedExamId: String(value), error: "" }))}
                  style={styles.picker}
                >
                  {examOptions.length ? (
                    examOptions.map((exam) => (
                      <Picker.Item key={exam.id} label={exam.name} value={String(exam.id)} />
                    ))
                  ) : (
                    <Picker.Item label="No exam available" value="" />
                  )}
                </Picker>
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, (!state.selectedSubjectId || !state.selectedExamId || state.starting) ? styles.disabled : null]}
              disabled={!state.selectedSubjectId || !state.selectedExamId || state.starting}
              onPress={startDiagnostic}
            >
              <Text style={styles.primaryButtonText}>{state.starting ? "Starting..." : "Start diagnostic"}</Text>
            </Pressable>
          </SectionCard>
        </>
      ) : null}

      {state.attempt ? (
        <>
          <SectionCard title={`Question ${state.currentIndex + 1} of ${totalQuestions}`} subtitle={currentQuestion?.concept_name || "Question"}>
            <Text style={styles.progressText}>{answeredCount} answered so far</Text>
            <Text style={styles.questionTitle}>{currentQuestion?.prompt}</Text>

            {currentQuestion?.options?.length ? (
              <View style={styles.optionsWrap}>
                {currentQuestion.options.map((option) => {
                  const selected = state.answers[currentQuestion.id]?.selected_option_id === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.optionRow, selected ? styles.optionRowActive : null]}
                      onPress={() => updateOption(currentQuestion.id, option.id)}
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
                onChangeText={(value) => updateText(currentQuestion.id, value)}
                multiline
              />
            )}

            <View style={styles.navRow}>
              <Pressable
                style={[styles.secondaryButton, state.currentIndex === 0 ? styles.disabled : null]}
                disabled={state.currentIndex === 0}
                onPress={() => setState((current) => ({ ...current, currentIndex: Math.max(current.currentIndex - 1, 0) }))}
              >
                <Text style={styles.secondaryButtonText}>Previous</Text>
              </Pressable>
              {isLastQuestion ? (
                <Pressable style={[styles.primaryButton, state.submitting ? styles.disabled : null]} disabled={state.submitting} onPress={submit}>
                  <Text style={styles.primaryButtonText}>{state.submitting ? "Submitting..." : "Submit"}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => setState((current) => ({ ...current, currentIndex: Math.min(current.currentIndex + 1, totalQuestions - 1) }))}
                >
                  <Text style={styles.primaryButtonText}>Next</Text>
                </Pressable>
              )}
            </View>
          </SectionCard>

          {state.result ? (
            <SectionCard title="Result ready" subtitle="Your report has been generated from this attempt." tone="accent">
              <View style={styles.resultRow}>
                <View style={styles.resultTile}>
                  <Text style={styles.resultLabel}>Score</Text>
                  <Text style={styles.resultValue}>{state.result.attempt.score_percent}%</Text>
                </View>
                <View style={styles.resultTile}>
                  <Text style={styles.resultLabel}>Health</Text>
                  <Text style={styles.resultValue}>{state.result.learning_health.health_score}</Text>
                </View>
              </View>
              <View style={styles.navRow}>
                <Pressable style={styles.secondaryButton} onPress={() => router.push("/(student)/report")}>
                  <Text style={styles.secondaryButtonText}>Open report</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={() => router.push("/(student)/learn")}>
                  <Text style={styles.primaryButtonText}>Open learn</Text>
                </Pressable>
              </View>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickerGroup: {
    gap: 8,
  },
  label: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  pickerWrap: {
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    ...shadows.card,
  },
  picker: {
    color: colors.ink,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#ffffff",
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
  disabled: {
    opacity: 0.55,
  },
  progressText: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: "700",
  },
  questionTitle: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "900",
  },
  optionsWrap: {
    gap: spacing.sm,
  },
  optionRow: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    ...shadows.card,
  },
  optionRowActive: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(251, 100, 4, 0.26)",
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    color: colors.ink,
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  resultLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  resultValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
