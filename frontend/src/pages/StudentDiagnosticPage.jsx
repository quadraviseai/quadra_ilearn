import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function StudentDiagnosticPage() {
  const { token } = useAuth();
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loadState, setLoadState] = useState({ loading: true, error: "" });
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [submitState, setSubmitState] = useState({ loading: false, error: "", result: null });

  useEffect(() => {
    let isMounted = true;

    async function loadAttempt() {
      setLoadState({ loading: true, error: "" });
      try {
        const data = await apiRequest(`/api/diagnostic/attempts/${attemptId}`, { token });
        if (!isMounted) {
          return;
        }
        setPayload(data);
        const initialAnswers = {};
        data.questions.forEach((question) => {
          initialAnswers[question.id] = {
            question_id: question.id,
            selected_option_id: question.existing_answer?.selected_option_id ?? "",
            answer_text: question.existing_answer?.answer_text ?? "",
            time_spent_seconds: question.existing_answer?.time_spent_seconds ?? 0,
          };
        });
        setAnswers(initialAnswers);
        setCurrentQuestionIndex(0);
        setLoadState({ loading: false, error: "" });
      } catch (requestError) {
        if (isMounted) {
          setLoadState({ loading: false, error: requestError.message });
        }
      }
    }

    loadAttempt();
    return () => {
      isMounted = false;
    };
  }, [attemptId, token]);

  const handleOptionChange = (questionId, optionId) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        selected_option_id: optionId,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitState({ loading: true, error: "", result: null });
    try {
      const result = await apiRequest(`/api/diagnostic/attempts/${attemptId}/submit`, {
        method: "POST",
        token,
        body: {
          answers: Object.values(answers).map((answer) => ({
            ...answer,
            selected_option_id: answer.selected_option_id || null,
          })),
        },
      });
      setSubmitState({ loading: false, error: "", result });
      setIsResultModalOpen(true);
    } catch (requestError) {
      setSubmitState({ loading: false, error: requestError.message, result: null });
    }
  };

  const answeredCount = Object.values(answers).filter((answer) => answer.selected_option_id).length;
  const totalQuestions = payload?.questions?.length ?? 0;
  const currentQuestion = payload?.questions?.[currentQuestionIndex] ?? null;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const currentQuestionAnswered = currentQuestion
    ? Boolean(answers[currentQuestion.id]?.selected_option_id)
    : false;
  const hasSubmitted = payload?.attempt?.status === "evaluated" || Boolean(submitState.result);

  if (loadState.loading) {
    return (
      <section className="panel status-card diagnostic-status-card">
        <h3>Loading diagnostic</h3>
        <p>Fetching questions for the selected attempt.</p>
      </section>
    );
  }

  if (loadState.error) {
    return (
      <section className="panel status-card diagnostic-status-card">
        <h3>Diagnostic unavailable</h3>
        <FormMessage>{loadState.error}</FormMessage>
      </section>
    );
  }

  return (
    <div className="diagnostic-attempt-page">
      <section className="diagnostic-attempt-hero panel">
        <div className="diagnostic-attempt-hero-copy">
          <h1 className="diagnostic-attempt-title">Diagnostic attempt</h1>
          <p className="diagnostic-attempt-subtitle">
            Complete each question carefully to update your learning health and concept mastery.
          </p>
          <div className="diagnostic-attempt-meta">
            <div className="diagnostic-attempt-meta-item">
              <span>Subject</span>
              <strong>{payload.attempt.subject_name}</strong>
            </div>
            <div className="diagnostic-attempt-meta-item">
              <span>Status</span>
              <strong>{payload.attempt.status}</strong>
            </div>
            <div className="diagnostic-attempt-meta-item">
              <span>Progress</span>
              <strong>
                {answeredCount}/{totalQuestions} answered
              </strong>
            </div>
          </div>
        </div>
        <button className="button button-secondary diagnostic-back-button" onClick={() => navigate("/student")}>
          Back to dashboard
        </button>
      </section>

      <form className="diagnostic-attempt-layout" onSubmit={handleSubmit}>
        <section className="diagnostic-attempt-questions panel">
          <div className="diagnostic-section-head">
            <div>
              <h3>Questions</h3>
              <p>Move question by question and submit after you finish the full attempt.</p>
            </div>
            <span className="status-badge">
              {answeredCount}/{totalQuestions} complete
            </span>
          </div>
          <div className="diagnostic-question-list">
            {currentQuestion ? (
              <article className="diagnostic-question-card" key={currentQuestion.id}>
                <div className="diagnostic-question-head">
                  <span className="diagnostic-question-number">{currentQuestionIndex + 1}</span>
                  <div className="diagnostic-question-copy">
                    <strong>{currentQuestion.prompt}</strong>
                    <div className="diagnostic-question-concept">Concept: {currentQuestion.concept_name}</div>
                  </div>
                </div>
                <div className="diagnostic-option-grid">
                  {currentQuestion.options.map((option) => (
                    <label
                      key={option.id}
                      className={`diagnostic-option${answers[currentQuestion.id]?.selected_option_id === option.id ? " selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={answers[currentQuestion.id]?.selected_option_id === option.id}
                        onChange={() => handleOptionChange(currentQuestion.id, option.id)}
                      />
                      <span className="diagnostic-option-dot" aria-hidden="true" />
                      <span>{option.option_text}</span>
                    </label>
                  ))}
                </div>
                <div className="diagnostic-pagination-actions">
                  <button
                    className="button button-secondary diagnostic-nav-button"
                    type="button"
                    onClick={() => setCurrentQuestionIndex((current) => Math.max(current - 1, 0))}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </button>
                  <div className="diagnostic-pagination-label">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </div>
                  {isLastQuestion ? (
                    <button
                      className="button button-primary diagnostic-nav-button"
                      type="submit"
                      disabled={submitState.loading || !currentQuestionAnswered || hasSubmitted}
                    >
                      {hasSubmitted ? "Submitted" : submitState.loading ? "Submitting..." : "Submit answers"}
                    </button>
                  ) : (
                    <button
                      className="button button-primary diagnostic-nav-button"
                      type="button"
                      onClick={() => setCurrentQuestionIndex((current) => Math.min(current + 1, totalQuestions - 1))}
                    >
                      Next
                    </button>
                  )}
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section className="diagnostic-submit-card panel">
          <div className="diagnostic-section-head diagnostic-submit-head">
            <div>
              <h3>Submit diagnostic</h3>
              <p>Track completion here. Submit from the final question once every answer is ready.</p>
            </div>
          </div>
          <div className="diagnostic-submit-summary">
            <div className="diagnostic-submit-metric">
              <span>Answered</span>
              <strong>
                {answeredCount}/{totalQuestions}
              </strong>
            </div>
            <div className="diagnostic-submit-metric">
              <span>Remaining</span>
              <strong>{Math.max(totalQuestions - answeredCount, 0)}</strong>
            </div>
          </div>
          <FormMessage>{submitState.error}</FormMessage>
        </section>
      </form>

      {isResultModalOpen && submitState.result ? (
        <div className="diagnostic-result-modal-backdrop" role="presentation">
          <section className="diagnostic-result-modal panel" role="dialog" aria-modal="true" aria-labelledby="diagnostic-result-title">
            <div className="diagnostic-result-head">
              <div>
                <span className="eyebrow diagnostic-result-eyebrow">Diagnostic report</span>
                <h2 id="diagnostic-result-title">Attempt submitted</h2>
                <p>Your latest report is ready. Review the performance snapshot below.</p>
              </div>
            </div>
            <div className="diagnostic-result-grid">
              <div className="diagnostic-result-metric">
                <span>Score</span>
                <strong>{submitState.result.attempt.score_percent}%</strong>
              </div>
              <div className="diagnostic-result-metric">
                <span>Health</span>
                <strong>{submitState.result.learning_health.health_score}</strong>
              </div>
              <div className="diagnostic-result-metric">
                <span>Current streak</span>
                <strong>{submitState.result.streak.current_streak_days} days</strong>
              </div>
            </div>
            <div className="diagnostic-result-actions">
              <button
                className="button button-primary"
                type="button"
                onClick={() => navigate("/student")}
              >
                Back to dashboard
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default StudentDiagnosticPage;
