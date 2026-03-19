import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Progress, Spin, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";

import { fetchAttemptDetail, resetAttemptTimer, saveAnswer, submitAttempt } from "../lib/studentFlowApi.js";
import { useAuth } from "../state/AuthContext.jsx";

const ATTEMPT_ALERT_MESSAGE =
  "You are not serious. Don't worry, we are giving you another chance. Select your answer. Don't worry if it can be wrong, we will guide you to solve this type of answer.";

function getAttemptTimerKey(attemptId) {
  return `quadrailearn-attempt-timer:${attemptId}`;
}

function readStoredCountdown(attemptId) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getAttemptTimerKey(attemptId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const endsAt = Number(parsed?.endsAt);
    return Number.isFinite(endsAt) && endsAt > 0 ? endsAt : null;
  } catch {
    return null;
  }
}

function writeStoredCountdown(attemptId, endsAt) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getAttemptTimerKey(attemptId),
    JSON.stringify({ endsAt }),
  );
}

function clearStoredCountdown(attemptId) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getAttemptTimerKey(attemptId));
}

function shiftStoredCountdown(attemptId, nextEndsAt) {
  writeStoredCountdown(attemptId, nextEndsAt);
}

function getRemainingSecondsFromEndsAt(endsAt) {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function StudentMockTestPage() {
  const { user, refreshCurrentUser } = useAuth();
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [timeExpiredOpen, setTimeExpiredOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [retryPaymentLoading, setRetryPaymentLoading] = useState(false);
  const [tokenMeta, setTokenMeta] = useState({ token_balance: user?.token_balance ?? 0, timer_reset_cost: user?.token_settings?.timer_reset_cost ?? 0 });
  const [countdownReady, setCountdownReady] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const lastAlertAtRef = useRef(0);
  const tabViolationPendingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const countdownEndsAtRef = useRef(null);
  const pauseStartedAtRef = useRef(null);
  const warningOpenRef = useRef(false);
  const timeExpiredOpenRef = useRef(false);
  const blurViolationPendingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const detail = await fetchAttemptDetail(attemptId);
        if (cancelled) {
          return;
        }
        setAttempt(detail.attempt);
        setQuestions(detail.questions);
        setTokenMeta({
          token_balance: detail.token_balance ?? user?.token_balance ?? 0,
          timer_reset_cost: detail.token_settings?.timer_reset_cost ?? user?.token_settings?.timer_reset_cost ?? 0,
        });
      } catch (error) {
        if (!cancelled) {
          message.error(error.message);
          navigate("/student", { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId, navigate, user?.token_balance, user?.token_settings?.timer_reset_cost]);

  useEffect(() => {
    if (!attempt?.id) {
      return undefined;
    }

    autoSubmittedRef.current = false;
    setCountdownReady(false);
    setTimeExpiredOpen(false);

    const totalDurationSeconds = Math.max(questions.length, 1) * 60;
    const storedEndsAt = readStoredCountdown(attempt.id);
    const endsAt = storedEndsAt ?? Date.now() + totalDurationSeconds * 1000;
    countdownEndsAtRef.current = endsAt;

    if (!storedEndsAt) {
      writeStoredCountdown(attempt.id, endsAt);
    }

    const intervalId = window.setInterval(() => {
      if (warningOpenRef.current || timeExpiredOpenRef.current) {
        return;
      }
      setRemainingSeconds(getRemainingSecondsFromEndsAt(countdownEndsAtRef.current));
    }, 1000);

    setRemainingSeconds(getRemainingSecondsFromEndsAt(countdownEndsAtRef.current));
    setCountdownReady(true);

    return () => window.clearInterval(intervalId);
  }, [attempt?.id, questions.length]);

  useEffect(() => {
    if (!attempt?.id || !countdownReady || countdownEndsAtRef.current == null) {
      return;
    }

    warningOpenRef.current = warningOpen;
    timeExpiredOpenRef.current = timeExpiredOpen;

    if (warningOpen || timeExpiredOpen) {
      if (pauseStartedAtRef.current == null) {
        pauseStartedAtRef.current = Date.now();
      }
      return;
    }

    if (pauseStartedAtRef.current != null) {
      const pausedDuration = Date.now() - pauseStartedAtRef.current;
      countdownEndsAtRef.current += pausedDuration;
      shiftStoredCountdown(attempt.id, countdownEndsAtRef.current);
      setRemainingSeconds(getRemainingSecondsFromEndsAt(countdownEndsAtRef.current));
      pauseStartedAtRef.current = null;
    }
  }, [attempt?.id, countdownReady, warningOpen, timeExpiredOpen]);

  useEffect(() => {
    const showAttemptAlert = () => {
      const now = Date.now();
      if (now - lastAlertAtRef.current < 1500) {
        return;
      }
      lastAlertAtRef.current = now;
      setViolationCount((current) => current + 1);
      setWarningOpen(true);
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      showAttemptAlert();
    };

    const handleCopyLike = (event) => {
      event.preventDefault();
      showAttemptAlert();
    };

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const modifierCombo = (event.ctrlKey || event.metaKey || event.altKey) && key !== "control" && key !== "meta" && key !== "alt";
      const shiftedCombo = event.shiftKey && key !== "shift";
      const blockedRefresh = key === "f5" || (ctrlOrMeta && key === "r");
      const blockedCopy = ctrlOrMeta && ["c", "x", "a", "p", "s", "u"].includes(key);
      const blockedDevTools = key === "f12" || (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key));
      const blockedModifierUse = modifierCombo || shiftedCombo;

      if (blockedRefresh || blockedCopy || blockedDevTools || blockedModifierUse) {
        event.preventDefault();
        showAttemptAlert();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabViolationPendingRef.current = true;
        return;
      }

      if (tabViolationPendingRef.current) {
        tabViolationPendingRef.current = false;
        showAttemptAlert();
      }
    };

    const handleWindowBlur = () => {
      blurViolationPendingRef.current = true;
    };

    const handleWindowFocus = () => {
      if (blurViolationPendingRef.current) {
        blurViolationPendingRef.current = false;
        showAttemptAlert();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyLike);
    document.addEventListener("cut", handleCopyLike);
    document.addEventListener("paste", handleCopyLike);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyLike);
      document.removeEventListener("cut", handleCopyLike);
      document.removeEventListener("paste", handleCopyLike);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  const answeredCount = useMemo(
    () => questions.filter((question) => question.existing_answer?.selected_option_id || question.existing_answer?.answer_text).length,
    [questions],
  );

  const timerLabel = useMemo(() => {
    if (remainingSeconds == null) {
      return "--:--";
    }

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    if (hours > 0) {
      return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
    }
    return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }, [remainingSeconds]);

  const handleAnswer = async (optionId) => {
    if (!attempt) {
      return;
    }

    const question = questions[currentIndex];
    try {
      const saved = await saveAnswer(attempt.id, {
        question_id: question.id,
        selected_option_id: optionId,
        time_spent_seconds: 0,
      });
      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? {
                ...item,
                existing_answer: {
                  selected_option_id: saved.selected_option_id,
                  answer_text: saved.answer_text,
                  time_spent_seconds: saved.time_spent_seconds,
                },
              }
            : item,
        ),
      );
      message.success("Answer saved", 0.8);
    } catch (error) {
      message.error(error.message);
    }
  };

  const performSubmit = async () => {
    setSubmitting(true);
    try {
      const report = await submitAttempt(attempt.id);
      clearStoredCountdown(attempt.id);
      navigate(`/student/report?reportId=${report.id}`, { replace: true });
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => setSubmitConfirmOpen(true);

  useEffect(() => {
    if (!attempt?.id || !countdownReady || warningOpen || timeExpiredOpen || remainingSeconds == null || submitting || autoSubmittedRef.current) {
      return;
    }

    if (remainingSeconds === 0) {
      setTimeExpiredOpen(true);
    }
  }, [attempt?.id, countdownReady, warningOpen, timeExpiredOpen, remainingSeconds, submitting]);

  useEffect(() => {
    if (!attempt?.id || submitting || autoSubmittedRef.current) {
      return;
    }

    if (violationCount >= 3) {
      autoSubmittedRef.current = true;
      setWarningOpen(false);
      message.warning("Too many violations detected. Your test is being submitted.");
      void performSubmit();
    }
  }, [attempt?.id, violationCount, submitting]);

  const handleRetryPayment = async () => {
    if (!attempt?.id) {
      return;
    }

    setRetryPaymentLoading(true);
    try {
      const data = await resetAttemptTimer(attempt.id);
      const resetDurationSeconds = data.reset_duration_seconds || Math.max(questions.length, 1) * 60;
      const nextEndsAt = Date.now() + resetDurationSeconds * 1000;
      pauseStartedAtRef.current = null;
      countdownEndsAtRef.current = nextEndsAt;
      warningOpenRef.current = false;
      timeExpiredOpenRef.current = false;
      writeStoredCountdown(attempt.id, nextEndsAt);
      setCountdownReady(true);
      setRemainingSeconds(getRemainingSecondsFromEndsAt(nextEndsAt));
      setTimeExpiredOpen(false);
      setTokenMeta((current) => ({
        ...current,
        token_balance: data.token_balance ?? current.token_balance,
      }));
      await refreshCurrentUser();
      message.success(`Timer reset unlocked. ${data.tokens_spent ?? tokenMeta.timer_reset_cost} tokens used.`);
    } catch (error) {
      message.error(error.message);
    } finally {
      setRetryPaymentLoading(false);
    }
  };

  if (loading) {
    return <Spin size="large" />;
  }

  if (!attempt || questions.length === 0) {
    return null;
  }

  const question = questions[currentIndex];

  return (
    <div className="student-flow-page student-attempt-page">
      <section className="student-attempt-shell">
        <header className="panel student-attempt-header">
          <div className="student-attempt-header-copy">
            <div className="student-attempt-header-title-row">
              <h1>{attempt.exam_name} mock test</h1>
              <span className="student-attempt-status-badge">
                {question.existing_answer?.selected_option_id ? "Saved" : "In progress"}
              </span>
            </div>
            <p>
              {attempt.subject_name}
              {question.chapter_name ? ` | ${question.chapter_name}` : ""}
              {question.topic_name ? ` | ${question.topic_name}` : ""}
            </p>
          </div>
          <div className="student-attempt-header-meta">
            <div>
              <span>Question</span>
              <strong>
                {currentIndex + 1} / {questions.length}
              </strong>
            </div>
            <div>
              <span>Answered</span>
              <strong>
                {answeredCount} / {questions.length}
              </strong>
            </div>
            <div>
              <span>Time left</span>
              <strong>{timerLabel}</strong>
            </div>
            <div>
              <span>Warnings</span>
              <strong>{violationCount}</strong>
            </div>
            <div>
              <span>Tokens</span>
              <strong>{tokenMeta.token_balance}</strong>
            </div>
          </div>
        </header>

        <section className="panel student-attempt-questionnaire">
          <Progress percent={Math.round((answeredCount / questions.length) * 100)} showInfo={false} />

          <article className="student-attempt-question-card">
            <div className="student-attempt-question-head">
              <span className="student-attempt-question-index">{question.display_order}</span>
              <div className="student-attempt-question-copy">
                <h3>{question.prompt}</h3>
              </div>
            </div>

            <div className="student-attempt-options">
              {question.options.map((option) => {
                const selected = question.existing_answer?.selected_option_id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`student-attempt-option${selected ? " is-selected" : ""}`}
                    onClick={() => handleAnswer(option.id)}
                  >
                    <span className="student-attempt-option-marker" />
                    <span>{option.option_text}</span>
                  </button>
                );
              })}
            </div>

            <div className="student-attempt-footer">
              <span className="student-attempt-status">
                {question.existing_answer?.selected_option_id ? "Answer saved" : "Select an option to save your answer"}
              </span>
              <div className="student-attempt-actions">
                <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}>
                  Previous
                </Button>
                <Button
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex((index) => index + 1)}
                >
                  Next
                </Button>
                <Button className="button button-primary" loading={submitting} onClick={handleSubmit}>
                  Submit test
                </Button>
              </div>
            </div>
          </article>
        </section>
      </section>
      <Modal
        open={submitConfirmOpen}
        onCancel={() => setSubmitConfirmOpen(false)}
        footer={null}
        centered
        title="Submit mock test"
        className="student-attempt-warning-dialog"
      >
        <div className="student-attempt-warning">
          <p>Your answers saved so far will be submitted and you will be taken to the result page.</p>
          <div className="student-timeup-actions">
            <Button
              className="student-timeup-secondary"
              onClick={() => setSubmitConfirmOpen(false)}
              disabled={submitting}
            >
              Continue test
            </Button>
            <button
              className="button button-primary student-timeup-primary"
              type="button"
              disabled={submitting}
              onClick={() => {
                setSubmitConfirmOpen(false);
                void performSubmit();
              }}
            >
              {submitting ? "Submitting..." : "Submit now"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={warningOpen}
        onCancel={() => setWarningOpen(false)}
        footer={null}
        centered
        title="Stay focused"
        className="student-attempt-warning-dialog"
      >
        <div className="student-attempt-warning">
          <p>{ATTEMPT_ALERT_MESSAGE}</p>
          <div className="student-attempt-warning-actions">
            <button className="button button-primary" type="button" onClick={() => setWarningOpen(false)}>
              I understand
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={timeExpiredOpen}
        onCancel={() => {}}
        closable={false}
        mask={{ closable: false }}
        footer={null}
        centered
        title="Time is up"
        className="student-attempt-warning-dialog"
      >
        <div className="student-attempt-warning">
          <p>
            Your time is up. Spend {tokenMeta.timer_reset_cost} tokens to reset the timer and continue this mock test, or submit now and view your result.
          </p>
          <div className="student-timeup-actions">
            <Button className="student-timeup-secondary" onClick={() => void performSubmit()} disabled={retryPaymentLoading}>
              View result
            </Button>
            <button className="button button-primary student-timeup-primary" type="button" disabled={retryPaymentLoading} onClick={handleRetryPayment}>
              {retryPaymentLoading ? "Unlocking..." : `Use ${tokenMeta.timer_reset_cost} tokens`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StudentMockTestPage;
