import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, ReadOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Tag, Typography } from "antd";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function renderMathExpression(expression, keyPrefix) {
  const replacements = [
    [/\\neq/g, "!=".replace("!=", "≠")],
    [/\\lambda/g, "λ"],
    [/\\mu/g, "μ"],
    [/\\alpha/g, "α"],
    [/\\beta/g, "β"],
    [/\\gamma/g, "γ"],
    [/\\Delta/g, "Δ"],
    [/\\pm/g, "±"],
    [/\\cdot/g, "·"],
  ];

  const normalized = replacements.reduce(
    (current, [pattern, value]) => current.replace(pattern, value),
    String(expression || "")
  );
  const tokens = normalized.split(/([a-zA-Z]\d+|_\d+|\^[0-9]+|\^[a-zA-Z]|\s+)/g).filter(Boolean);

  return tokens.map((token, index) => {
    if (/^[a-zA-Z]\d+$/.test(token)) {
      return (
        <span key={`${keyPrefix}-var-${index}`}>
          {token[0]}
          <sub>{token.slice(1)}</sub>
        </span>
      );
    }
    if (/^_\d+$/.test(token)) {
      return <sub key={`${keyPrefix}-sub-${index}`}>{token.slice(1)}</sub>;
    }
    if (/^\^[0-9]+$/.test(token) || /^\^[a-zA-Z]$/.test(token)) {
      return <sup key={`${keyPrefix}-sup-${index}`}>{token.slice(1)}</sup>;
    }
    return <span key={`${keyPrefix}-text-${index}`}>{token}</span>;
  });
}

function renderMathText(text) {
  const value = String(text || "");
  const segments = value.split(/(\$[^$]+\$)/g).filter(Boolean);

  return segments.map((segment, index) => {
    if (segment.startsWith("$") && segment.endsWith("$")) {
      return (
        <span className="study-inline-math" key={`math-${index}`}>
          {renderMathExpression(segment.slice(1, -1), `expr-${index}`)}
        </span>
      );
    }

    return renderMathExpression(segment, `plain-${index}`);
  });
}

function normalizeStudySteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step) => {
      if (typeof step === "string") {
        return {
          title: step,
          detail: "",
          checkpoints: [],
        };
      }
      if (!step || typeof step !== "object") {
        return null;
      }
      return {
        title: step.title || "Study step",
        detail: step.detail || "",
        checkpoints: Array.isArray(step.checkpoints) ? step.checkpoints : [],
        session: step.session && typeof step.session === "object" ? step.session : null,
      };
    })
    .filter(Boolean);
}

function getSelectedExamContent(task, selectedExam) {
  const content = task?.ai_study_content;
  if (!content || typeof content !== "object") {
    return null;
  }

  if (content.exam_content && typeof content.exam_content === "object") {
    return content.exam_content[selectedExam] || null;
  }

  if (!selectedExam || content.target_exam === selectedExam) {
    return content;
  }

  return null;
}

function StudentStudySessionPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const [task, setTask] = useState(null);
  const [state, setState] = useState({ loading: true, error: "", stepLoadingIndex: -1, completing: false });
  const [openStepIndex, setOpenStepIndex] = useState(-1);
  const selectedExam = searchParams.get("exam") || "";
  const selectedExamContent = getSelectedExamContent(task, selectedExam);

  useEffect(() => {
    let isMounted = true;

    async function startStudySession() {
      setState({ loading: true, error: "" });
      try {
        const data = await apiRequest(`/api/study-planner/tasks/${taskId}/start`, {
          method: "POST",
          token,
          body: {
            target_exam: selectedExam,
          },
        });
        if (!isMounted) {
          return;
        }
        setTask(data);
        setOpenStepIndex(-1);
        setState({ loading: false, error: "", stepLoadingIndex: -1, completing: false });
      } catch (error) {
        if (isMounted) {
          setState({ loading: false, error: error.message, stepLoadingIndex: -1, completing: false });
        }
      }
    }

    startStudySession();
    return () => {
      isMounted = false;
    };
  }, [selectedExam, taskId, token]);

  const studySteps = normalizeStudySteps(selectedExamContent?.study_steps);

  const handleStartStep = async (stepIndex) => {
    if (studySteps[stepIndex]?.session) {
      setOpenStepIndex((current) => (current === stepIndex ? -1 : stepIndex));
      return;
    }

    setState((current) => ({ ...current, error: "", stepLoadingIndex: stepIndex }));
    try {
      const data = await apiRequest(`/api/study-planner/tasks/${taskId}/steps/${stepIndex}/start`, {
        method: "POST",
        token,
        body: {
          target_exam: selectedExam,
        },
      });
      setTask(data);
      setOpenStepIndex(stepIndex);
      setState((current) => ({ ...current, stepLoadingIndex: -1 }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, stepLoadingIndex: -1 }));
    }
  };

  const handleMarkCompleted = async () => {
    setState((current) => ({ ...current, error: "", completing: true }));
    try {
      const data = await apiRequest(`/api/study-planner/tasks/${taskId}`, {
        method: "PATCH",
        token,
        body: {
          status: "done",
        },
      });
      setTask(data);
      setState((current) => ({ ...current, completing: false }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, completing: false }));
    }
  };

  return (
    <section className="study-session-page">
      <Card className="study-plan-hero student-antd-card study-session-hero" variant="borderless">
        <div className="study-plan-hero-head">
          <div>
            <span className="eyebrow study-plan-eyebrow">Study session</span>
            <Typography.Title level={2} className="study-plan-title">
              {selectedExamContent?.heading || task?.title || "Preparing your study session"}
            </Typography.Title>
            <Typography.Paragraph className="study-plan-subtitle">
              {selectedExamContent?.overview || "AI is preparing a guided study flow for this topic."}
            </Typography.Paragraph>
          </div>
          <Button
            className="diagnostic-back-button"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/student/study-plan")}
          >
            Back to study plan
          </Button>
        </div>

        {task ? (
          <>
            <div className="study-plan-metrics">
              <div className="study-plan-metric">
                <ReadOutlined className="study-plan-metric-icon" />
                <Typography.Text>{task.concept_name || "General topic"}</Typography.Text>
                <strong>{studySteps.length} steps</strong>
              </div>
              <div className="study-plan-metric">
                <ClockCircleOutlined className="study-plan-metric-icon" />
                <Typography.Text>Session time</Typography.Text>
                <strong>{task.estimated_minutes} min</strong>
              </div>
              <div className="study-plan-metric">
                <CheckCircleOutlined className="study-plan-metric-icon" />
                <Typography.Text>Status</Typography.Text>
                <strong>{task.status}</strong>
              </div>
            </div>
            <div className="study-session-hero-actions">
              <Button
                className="button button-primary"
                onClick={handleMarkCompleted}
                loading={state.completing}
                disabled={task.status === "done"}
              >
                {task.status === "done" ? "Completed" : "Mark as completed"}
              </Button>
            </div>
          </>
        ) : null}
      </Card>

      <FormMessage>{state.error}</FormMessage>

      {state.loading ? <Card className="study-plan-board study-plan-board-surface">Loading study session...</Card> : null}

      {!state.loading && !task ? (
        <Card className="study-plan-board study-plan-board-surface">
          <Empty description="This study task could not be loaded." />
        </Card>
      ) : null}

      {!state.loading && task ? (
        <div className="study-session-layout">
          <Card className="study-session-card student-antd-card" variant="borderless">
            <Typography.Title level={4}>Exam focus</Typography.Title>
            <Typography.Paragraph>
              {renderMathText(
                selectedExamContent?.exam_focus || "Use this session to strengthen the concept for your target exam."
              )}
            </Typography.Paragraph>

            <Typography.Title level={5}>Key points to keep in mind</Typography.Title>
            <ul className="study-session-list">
              {(selectedExamContent?.key_points || []).map((item) => (
                <li key={item}>{renderMathText(item)}</li>
              ))}
            </ul>

            <Typography.Title level={5}>Quick self-check</Typography.Title>
            <ul className="study-session-list">
              {(selectedExamContent?.quick_check || []).map((item) => (
                <li key={item}>{renderMathText(item)}</li>
              ))}
            </ul>
          </Card>

          <div className="study-session-steps">
            {studySteps.map((step, index) => (
              <Card className="study-session-step-card student-antd-card" variant="borderless" key={`${step.title}-${index}`}>
                <div className="study-session-step-head">
                  <div>
                    <Tag color="blue">Step {index + 1}</Tag>
                    <Typography.Title level={4}>{step.title}</Typography.Title>
                  </div>
                  <Button
                    className="study-session-step-action"
                    onClick={() => handleStartStep(index)}
                    loading={state.stepLoadingIndex === index}
                  >
                    {step.session ? (openStepIndex === index ? "Hide study content" : "Open study content") : "Start studying"}
                  </Button>
                </div>
                {step.detail ? <Typography.Paragraph>{renderMathText(step.detail)}</Typography.Paragraph> : null}
                {step.checkpoints?.length ? (
                  <>
                    <Typography.Title level={5}>What to do in this step</Typography.Title>
                    <ul className="study-session-list">
                      {step.checkpoints.map((checkpoint) => (
                        <li key={checkpoint}>{renderMathText(checkpoint)}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {step.session && openStepIndex === index ? (
                  <div className="study-session-step-session">
                    <Typography.Title level={5}>{renderMathText(step.session.heading)}</Typography.Title>
                    {step.session.exam_scope_note ? (
                      <Typography.Paragraph className="study-session-step-note">
                        {renderMathText(step.session.exam_scope_note)}
                      </Typography.Paragraph>
                    ) : null}
                    {step.session.layman_explanation ? (
                      <>
                        <Typography.Title level={5}>Simple explanation</Typography.Title>
                        <Typography.Paragraph>{renderMathText(step.session.layman_explanation)}</Typography.Paragraph>
                      </>
                    ) : step.session.explanation ? (
                      <>
                        <Typography.Title level={5}>Simple explanation</Typography.Title>
                        <Typography.Paragraph>{renderMathText(step.session.explanation)}</Typography.Paragraph>
                      </>
                    ) : null}
                    {step.session.exam_notes?.length ? (
                      <>
                        <Typography.Title level={5}>Exam-based notes</Typography.Title>
                        <ul className="study-session-list">
                          {step.session.exam_notes.map((item) => (
                            <li key={item}>{renderMathText(item)}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {step.session.master_guide ? (
                      <>
                        <Typography.Title level={5}>Master guide to crack this exam</Typography.Title>
                        <Typography.Paragraph>{renderMathText(step.session.master_guide)}</Typography.Paragraph>
                      </>
                    ) : null}
                    {step.session.shortcut_guide ? (
                      <>
                        <Typography.Title level={5}>Master shortcut for this exam</Typography.Title>
                        <Typography.Paragraph>{renderMathText(step.session.shortcut_guide)}</Typography.Paragraph>
                      </>
                    ) : null}
                    {step.session.worked_ideas?.length ? (
                      <>
                        <Typography.Title level={5}>Worked ideas</Typography.Title>
                        <ul className="study-session-list">
                          {step.session.worked_ideas.map((item) => (
                            <li key={item}>{renderMathText(item)}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {step.session.practice_tasks?.length ? (
                      <>
                        <Typography.Title level={5}>Practice for this exam</Typography.Title>
                        <ul className="study-session-list">
                          {step.session.practice_tasks.map((item) => (
                            <li key={item}>{renderMathText(item)}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default StudentStudySessionPage;
