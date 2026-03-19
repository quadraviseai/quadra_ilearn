import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "./api";

const SELECTION_KEY = "quadrailearn-mobile-student-flow-selection";

export async function getSelectedFlow() {
  try {
    const raw = await AsyncStorage.getItem(SELECTION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      examId: parsed?.examId ?? "",
      subjectId: parsed?.subjectId ?? "",
    };
  } catch {
    return { examId: "", subjectId: "" };
  }
}

export async function setSelectedFlow(examId, subjectId) {
  const next = { examId: String(examId || ""), subjectId: String(subjectId || "") };
  await AsyncStorage.setItem(SELECTION_KEY, JSON.stringify(next));
  return next;
}

export async function clearSelectedFlow() {
  await AsyncStorage.removeItem(SELECTION_KEY);
}

export function fetchExams() {
  return apiRequest("/api/diagnostic/exams");
}

export function fetchSubjects(examId) {
  return apiRequest(`/api/diagnostic/exams/${examId}/subjects`);
}

export async function fetchLatestReport() {
  try {
    return await apiRequest("/api/diagnostic/reports/latest");
  } catch (error) {
    if (error.message === "No report available.") {
      return null;
    }
    throw error;
  }
}

export function fetchReport(attemptId) {
  return apiRequest(`/api/diagnostic/reports/${attemptId}`);
}

export function fetchLearning(attemptId) {
  return apiRequest(`/api/diagnostic/reports/${attemptId}/learning`);
}

export function fetchWeakTopicAIReview(attemptId, conceptId) {
  return apiRequest(`/api/diagnostic/reports/${attemptId}/learning/${conceptId}/ai`);
}

export function unlockRetest(examId, subjectId) {
  return apiRequest("/api/diagnostic/payments/unlock", {
    method: "POST",
    body: {
      exam_id: examId,
      subject_id: subjectId,
      provider: "mobile-demo",
    },
  });
}
