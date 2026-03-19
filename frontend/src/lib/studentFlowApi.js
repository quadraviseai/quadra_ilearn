import { apiRequest } from "./api.js";

const SELECTION_KEY = "quadrailearn-student-flow-selection";

function readSelection() {
  if (typeof window === "undefined") {
    return { examId: null, subjectId: null };
  }

  try {
    return JSON.parse(window.localStorage.getItem(SELECTION_KEY)) || { examId: null, subjectId: null };
  } catch {
    return { examId: null, subjectId: null };
  }
}

function writeSelection(selection) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
}

export function getSelectedFlow() {
  return readSelection();
}

export function setSelectedExam(examId) {
  const current = readSelection();
  const next = { examId, subjectId: current.examId === examId ? current.subjectId : null };
  writeSelection(next);
  return next;
}

export function setSelectedSubject(subjectId) {
  const current = readSelection();
  const next = { ...current, subjectId };
  writeSelection(next);
  return next;
}

export function setSelectedFlow(examId, subjectId) {
  const next = { examId, subjectId };
  writeSelection(next);
  return next;
}

export async function fetchExams() {
  return apiRequest("/api/diagnostic/exams");
}

export async function fetchSubjects(examId) {
  return apiRequest(`/api/diagnostic/exams/${examId}/subjects`);
}

export async function fetchEligibility(examId, subjectId) {
  const params = new URLSearchParams({ exam_id: examId, subject_id: subjectId });
  return apiRequest(`/api/diagnostic/eligibility?${params.toString()}`);
}

export async function fetchActiveAttempt(examId, subjectId) {
  try {
    const params = new URLSearchParams({ exam_id: examId, subject_id: subjectId });
    return await apiRequest(`/api/diagnostic/attempts/active?${params.toString()}`);
  } catch (error) {
    if (error.message === "No active attempt found.") {
      return null;
    }
    throw error;
  }
}

export async function startAttempt(examId, subjectId) {
  return apiRequest("/api/diagnostic/attempts/start", {
    method: "POST",
    body: { exam_id: examId, subject_id: subjectId },
  });
}

export async function fetchAttemptDetail(attemptId) {
  return apiRequest(`/api/diagnostic/attempts/${attemptId}`);
}

export async function saveAnswer(attemptId, payload) {
  return apiRequest(`/api/diagnostic/attempts/${attemptId}/answers`, {
    method: "PATCH",
    body: payload,
  });
}

export async function submitAttempt(attemptId) {
  return apiRequest(`/api/diagnostic/attempts/${attemptId}/submit`, {
    method: "POST",
    body: {},
  });
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

export async function fetchReport(attemptId) {
  return apiRequest(`/api/diagnostic/reports/${attemptId}`);
}

export async function fetchLearning(attemptId) {
  return apiRequest(`/api/diagnostic/reports/${attemptId}/learning`);
}

export async function fetchWeakTopicAIReview(attemptId, conceptId) {
  return apiRequest(`/api/diagnostic/reports/${attemptId}/learning/${conceptId}/ai`);
}

export async function unlockRetest(examId, subjectId) {
  return apiRequest("/api/diagnostic/payments/unlock", {
    method: "POST",
    body: { exam_id: examId, subject_id: subjectId, provider: "web-demo" },
  });
}
