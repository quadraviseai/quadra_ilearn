import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const MIN_DEMO_DURATION_SECONDS = 60;
const SECONDS_PER_QUESTION = 45;
const DEMO_STORAGE_KEY = "quadrailearn-demo-session";

let demoSession = null;

function canUseWebStorage() {
  return Platform.OS === "web" && typeof localStorage !== "undefined";
}

function getSessionQuestions(session) {
  return Array.isArray(session?.questions) ? session.questions : [];
}

function getDurationSeconds(questionCount) {
  return Math.max(MIN_DEMO_DURATION_SECONDS, Number(questionCount || 0) * SECONDS_PER_QUESTION);
}

function persistDemoSession(session) {
  if (canUseWebStorage()) {
    if (!session) {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      return;
    }

    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session));
    return;
  }

  if (!session) {
    void AsyncStorage.removeItem(DEMO_STORAGE_KEY);
    return;
  }

  void AsyncStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session));
}

function readPersistedDemoSession() {
  if (!canUseWebStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function hydrateDemoSession() {
  if (demoSession) {
    return demoSession;
  }

  if (canUseWebStorage()) {
    demoSession = readPersistedDemoSession();
    return demoSession;
  }

  try {
    const raw = await AsyncStorage.getItem(DEMO_STORAGE_KEY);
    demoSession = raw ? JSON.parse(raw) : null;
    return demoSession;
  } catch {
    return null;
  }
}

export function getDemoQuestions() {
  return getSessionQuestions(getDemoSession());
}

export function startDemoSession(examName = "Quick Demo", metadata = {}) {
  const questions = Array.isArray(metadata.questions) ? metadata.questions : [];
  const questionCount = Number(metadata.questionCount || questions.length || 0);

  demoSession = {
    examName,
    examId: String(metadata.examId || ""),
    questionCount,
    questions,
    startedAt: Date.now(),
    durationSeconds: Number(metadata.durationSeconds || 0) || getDurationSeconds(questionCount),
    answers: {},
  };
  persistDemoSession(demoSession);
  return demoSession;
}

export function getDemoSession() {
  if (demoSession) {
    return demoSession;
  }

  demoSession = readPersistedDemoSession();
  return demoSession;
}

export function answerDemoQuestion(questionId, optionId) {
  const currentSession = getDemoSession();
  if (!currentSession) {
    return null;
  }

  demoSession = {
    ...currentSession,
    answers: {
      ...currentSession.answers,
      [questionId]: optionId,
    },
  };
  persistDemoSession(demoSession);
  return demoSession;
}

export function getRemainingDemoSeconds() {
  const currentSession = getDemoSession();
  if (!currentSession) {
    return MIN_DEMO_DURATION_SECONDS;
  }

  const elapsed = Math.floor((Date.now() - currentSession.startedAt) / 1000);
  return Math.max(0, currentSession.durationSeconds - elapsed);
}

export function resetDemoSession() {
  demoSession = null;
  persistDemoSession(null);
}

export function buildDemoResult() {
  const currentSession = getDemoSession();
  if (!currentSession) {
    return null;
  }

  const questions = getSessionQuestions(currentSession);
  if (!questions.length) {
    return null;
  }

  const answers = currentSession.answers || {};
  let correct = 0;
  let wrong = 0;

  questions.forEach((question) => {
    const picked = answers[question.id];
    if (!picked) {
      return;
    }

    const correctOptionId = question.correctOptionId || question.correct_option_id;
    if (picked === correctOptionId) {
      correct += 1;
    } else {
      wrong += 1;
    }
  });

  const unanswered = questions.length - correct - wrong;
  const elapsed = Math.min(
    currentSession.durationSeconds,
    Math.max(1, Math.floor((Date.now() - currentSession.startedAt) / 1000)),
  );
  const accuracy = questions.length > 0 ? correct / questions.length : 0;
  const betterThan = Math.max(0, Math.min(100, Math.round(accuracy * 100)));
  const estimatedRank = Math.max(12, Math.round((100 - betterThan) * 23));
  const weakTopics = questions
    .filter((question) => {
      const correctOptionId = question.correctOptionId || question.correct_option_id;
      return answers[question.id] !== correctOptionId;
    })
    .map((question) => ({
      topic: question.topic,
      explanation:
        question.explanation
        || `You need a sharper recall pattern for ${question.topic}. Review the core method once and try one more timed question.`,
    }));

  return {
    examName: currentSession.examName,
    examId: currentSession.examId,
    totalQuestions: questions.length,
    correct,
    wrong,
    unanswered,
    elapsedSeconds: elapsed,
    betterThan,
    rankText: `#${estimatedRank} out of 2,340 students`,
    weakTopics: weakTopics.length
      ? weakTopics
      : [{ topic: "Accuracy", explanation: "Your basics are solid. Keep practicing to improve speed." }],
  };
}
