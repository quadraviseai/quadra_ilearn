import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const DEMO_DURATION_SECONDS = 60;
const DEMO_STORAGE_KEY = "quadrailearn-demo-session";

const QUESTIONS = [
  {
    id: "q1",
    topic: "Kinematics",
    prompt: "A car starts from rest and accelerates uniformly at 2 m/s². What distance does it cover in 4 seconds?",
    options: [
      { id: "a", label: "8 m" },
      { id: "b", label: "16 m" },
      { id: "c", label: "24 m" },
      { id: "d", label: "32 m" },
    ],
    correctOptionId: "b",
  },
  {
    id: "q2",
    topic: "Biology Cells",
    prompt: "Which cell organelle is known as the powerhouse of the cell?",
    options: [
      { id: "a", label: "Nucleus" },
      { id: "b", label: "Ribosome" },
      { id: "c", label: "Mitochondria" },
      { id: "d", label: "Golgi body" },
    ],
    correctOptionId: "c",
  },
  {
    id: "q3",
    topic: "Quadratic Equations",
    prompt: "If x² - 5x + 6 = 0, what are the roots?",
    options: [
      { id: "a", label: "2 and 3" },
      { id: "b", label: "1 and 6" },
      { id: "c", label: "-2 and -3" },
      { id: "d", label: "3 and 6" },
    ],
    correctOptionId: "a",
  },
];

let demoSession = null;

function canUseWebStorage() {
  return Platform.OS === "web" && typeof localStorage !== "undefined";
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
  return QUESTIONS;
}

export function startDemoSession(examName = "Quick Demo") {
  demoSession = {
    examName,
    startedAt: Date.now(),
    durationSeconds: DEMO_DURATION_SECONDS,
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
    return DEMO_DURATION_SECONDS;
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

  const answers = currentSession.answers || {};
  let correct = 0;
  let wrong = 0;

  QUESTIONS.forEach((question) => {
    const picked = answers[question.id];
    if (!picked) {
      return;
    }
    if (picked === question.correctOptionId) {
      correct += 1;
    } else {
      wrong += 1;
    }
  });

  const unanswered = QUESTIONS.length - correct - wrong;
  const elapsed = Math.min(
    currentSession.durationSeconds,
    Math.max(1, Math.floor((Date.now() - currentSession.startedAt) / 1000)),
  );
  const betterThanLookup = {
    0: 24,
    1: 43,
    2: 68,
    3: 91,
  };
  const weakTopics = QUESTIONS.filter((question) => answers[question.id] !== question.correctOptionId).map((question) => ({
    topic: question.topic,
    explanation: `You need a sharper recall pattern for ${question.topic}. Review the core method once and try one more timed question.`,
  }));

  return {
    examName: currentSession.examName,
    totalQuestions: QUESTIONS.length,
    correct,
    wrong,
    unanswered,
    elapsedSeconds: elapsed,
    betterThan: betterThanLookup[correct] ?? 50,
    rankText: "#124 out of 2,340 students",
    weakTopics: weakTopics.length ? weakTopics : [{ topic: "Accuracy", explanation: "Your basics are solid. Keep practicing to improve speed." }],
  };
}
