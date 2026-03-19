import { useEffect, useMemo, useState } from "react";
import { Button, Spin, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import {
  fetchLatestReport,
  fetchLearning,
  fetchReport,
  fetchWeakTopicAIReview,
  setSelectedFlow,
} from "../lib/studentFlowApi.js";
import { useAuth } from "../state/AuthContext.jsx";

function StudentLearnPage() {
  const { user, refreshCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const reportId = searchParams.get("reportId");
  const conceptId = searchParams.get("conceptId");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [learningCards, setLearningCards] = useState([]);
  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [learningMeta, setLearningMeta] = useState({ token_balance: 0, token_settings: null, unlocked_concept_ids: [] });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const reportData = reportId ? await fetchReport(reportId) : await fetchLatestReport();
        if (!reportData) {
          if (!cancelled) {
            setReport(null);
          }
          return;
        }
        const learningData = await fetchLearning(reportData.id);
        if (cancelled) {
          return;
        }
        setReport(reportData);
        setLearningCards(learningData.learning_cards || []);
        setLearningMeta({
          token_balance: learningData.token_balance ?? user?.token_balance ?? 0,
          token_settings: learningData.token_settings ?? null,
          unlocked_concept_ids: learningData.unlocked_concept_ids ?? [],
        });

        if (conceptId) {
          setAiLoading(true);
          try {
            const aiData = await fetchWeakTopicAIReview(reportData.id, conceptId);
            if (!cancelled) {
              setAiReview(aiData);
              setLearningMeta((current) => ({
                ...current,
                token_balance: aiData.token_balance ?? current.token_balance,
                unlocked_concept_ids: current.unlocked_concept_ids.includes(conceptId)
                  ? current.unlocked_concept_ids
                  : [...current.unlocked_concept_ids, conceptId],
              }));
              await refreshCurrentUser();
            }
          } catch (error) {
            if (!cancelled) {
              setAiReview(null);
              message.warning(error.message);
            }
          } finally {
            if (!cancelled) {
              setAiLoading(false);
            }
          }
        } else {
          setAiReview(null);
          setAiLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          message.error(error.message);
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
  }, [conceptId, refreshCurrentUser, reportId, user?.token_balance]);

  const filteredCards = useMemo(() => {
    if (!conceptId) {
      return learningCards;
    }
    return learningCards.filter((card) => String(card.concept_id) === conceptId);
  }, [conceptId, learningCards]);

  const selectedCard = filteredCards[0] ?? null;
  const weakTopicCost = learningMeta.token_settings?.weak_topic_unlock_cost ?? user?.token_settings?.weak_topic_unlock_cost ?? 0;
  const alreadyUnlocked = conceptId ? learningMeta.unlocked_concept_ids.includes(conceptId) : false;

  if (loading) {
    return <Spin size="large" />;
  }

  if (!report) {
    return (
      <div className="student-flow-page">
        <article className="panel student-flow-empty">
          <h2>No weak-topic content yet</h2>
          <p>Take and submit a test to unlock weak-topic learning content.</p>
          <Button className="button button-primary" onClick={() => navigate("/student")}>
            Back to exams
          </Button>
        </article>
      </div>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <div className="student-flow-page">
        <article className="panel student-flow-empty">
          <h2>No concept guide found</h2>
          <p>This weak topic could not be mapped to guided review content yet.</p>
          <Button onClick={() => navigate(`/student/report?reportId=${report.id}`)}>Back to report</Button>
        </article>
      </div>
    );
  }

  return (
    <div className="student-flow-page student-learn-page">
      <section className="panel student-learn-hero">
        <div>
          <h1>{conceptId && selectedCard ? `${selectedCard.topic} review` : "AI weak-topic coach"}</h1>
          <p>
            {conceptId && selectedCard
              ? `Focused guidance for ${selectedCard.topic} in ${selectedCard.chapter || report.subject_name}.`
              : `Teacher-style review for your weak topics from ${report.subject_name}.`}
          </p>
          {conceptId ? (
            <p>
              Tokens: <strong>{learningMeta.token_balance}</strong>
              {alreadyUnlocked ? " | This weak topic is already unlocked." : ` | Unlock cost: ${weakTopicCost} tokens`}
            </p>
          ) : null}
        </div>
        <div className="student-learn-hero-actions">
          <Button onClick={() => navigate(`/student/report?reportId=${report.id}`)}>Back to report</Button>
          <Button
            className="button button-primary"
            onClick={() => {
              setSelectedFlow(report.exam, report.subject);
              navigate("/student");
            }}
          >
            Start retest
          </Button>
        </div>
      </section>

      {filteredCards.map((card) => (
        <section key={`${card.concept_id}-${card.topic}`} className="student-learn-coach-layout">
          <article className="panel student-learn-coach-card student-learn-coach-card-primary">
            <span className="student-learn-chip">AI review coach</span>
            <h2>{aiReview?.heading || card.topic}</h2>
            <p>{aiReview?.layman_explanation || card.summary}</p>

            <div className="student-learn-insight-grid">
              <div className="student-learn-insight-card">
                <span>Teacher explains</span>
                <strong>{card.chapter || report.subject_name}</strong>
                <p>
                  {aiLoading
                    ? "AI is preparing a teacher-style walkthrough for this concept."
                    : aiReview?.teacher_guide ||
                      "This question type usually becomes easier when you identify the pattern early and apply one clean method instead of switching approaches midway."}
                </p>
              </div>
              <div className="student-learn-insight-card">
                <span>Shortcut</span>
                <strong>{String(card.primary_mistake || "concept_mistake").replaceAll("_", " ")}</strong>
                <p>
                  {aiLoading
                    ? "Generating shortcut guidance..."
                    : aiReview?.shortcut_guide || card.guidance?.[0] || "Rebuild the core idea, then solve the simplest variation first."}
                </p>
              </div>
            </div>
          </article>

          <article className="panel student-learn-coach-card">
            <span className="student-learn-chip student-learn-chip-soft">Practice plan</span>
            <h2>How to solve these questions better</h2>
            <ul className="student-learning-list student-learn-guidance-list">
              {(aiReview?.solve_steps?.length ? aiReview.solve_steps : card.guidance).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="student-flow-inline-actions">
              <span>{`Misses: ${card.misses}`}</span>
              <span>{`Next level: ${card.adaptive_stage || "easy"}`}</span>
            </div>
            <p className="student-report-muted">
              {aiReview?.common_trap || `Practice ladder: ${(card.ladder || []).join(" -> ")}`}
            </p>
            {aiReview?.practice_tip ? <p className="student-report-muted">{aiReview.practice_tip}</p> : null}
            {aiReview?.question_prompt ? (
              <div className="student-learn-question-review">
                <strong>Question reviewed</strong>
                <p>{aiReview.question_prompt}</p>
                <span>{`Your answer: ${aiReview.student_answer}`}</span>
                <span>{`Correct answer: ${aiReview.correct_answer}`}</span>
              </div>
            ) : null}
          </article>
        </section>
      ))}
    </div>
  );
}

export default StudentLearnPage;
