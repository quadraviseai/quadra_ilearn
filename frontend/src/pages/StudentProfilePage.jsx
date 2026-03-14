import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Row, Col, Typography } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const emptyProfile = {
  email: "",
  phone: "",
  full_name: "",
  class_name: "",
  date_of_birth: "",
  board: "",
  school_name: "",
  primary_target_exam: "",
  secondary_target_exam: "",
};

function formatSuggestionState(data) {
  const suggestions = Array.isArray(data?.ai_exam_suggestions)
    ? data.ai_exam_suggestions
    : Array.isArray(data?.suggestions)
      ? data.suggestions
      : [];
  const generatedAt = data?.ai_exam_suggestions_generated_at || data?.generated_at || null;

  if (!suggestions.length && !generatedAt) {
    return null;
  }

  return {
    suggestions,
    generatedAt,
  };
}

function StudentProfilePage() {
  const { token } = useAuth();
  const [form, setForm] = useState(emptyProfile);
  const [state, setState] = useState({ loading: true, saving: false, error: "", success: "" });
  const [examSuggestion, setExamSuggestion] = useState({
    loading: false,
    error: "",
    data: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setState((current) => ({ ...current, loading: true, error: "", success: "" }));
      try {
        const data = await apiRequest("/api/students/profile", { token });
        if (!isMounted) {
          return;
        }
        setForm({
          email: data.email || "",
          phone: data.phone || "",
          full_name: data.full_name || "",
          class_name: data.class_name || "",
          date_of_birth: data.date_of_birth || "",
          board: data.board || "",
          school_name: data.school_name || "",
          primary_target_exam: data.primary_target_exam || "",
          secondary_target_exam: data.secondary_target_exam || "",
        });
        setExamSuggestion({
          loading: false,
          error: "",
          data: formatSuggestionState(data),
        });
        setState((current) => ({ ...current, loading: false }));
      } catch (error) {
        if (isMounted) {
          setState((current) => ({ ...current, loading: false, error: error.message }));
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFetchPrimaryExamSuggestion = async () => {
    if (!form.class_name.trim()) {
      setExamSuggestion({
        loading: false,
        error: "Add the student's class to get an AI exam suggestion.",
        data: null,
      });
      return;
    }

    setExamSuggestion({ loading: true, error: "", data: null });
    try {
      const data = await apiRequest("/api/students/profile/primary-exam-suggestion", {
        method: "POST",
        token,
        body: {
          class_name: form.class_name,
          date_of_birth: form.date_of_birth || null,
          board: form.board,
          school_name: form.school_name,
        },
      });
      setExamSuggestion({ loading: false, error: "", data: formatSuggestionState(data) });
    } catch (error) {
      setExamSuggestion({ loading: false, error: error.message, data: null });
    }
  };

  const applySuggestion = (target, examName) => {
    updateField(target, examName);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "", success: "" }));
    try {
      const payload = {
        phone: form.phone,
        full_name: form.full_name,
        class_name: form.class_name,
        date_of_birth: form.date_of_birth || null,
        board: form.board,
        school_name: form.school_name,
        primary_target_exam: form.primary_target_exam,
        secondary_target_exam: form.secondary_target_exam,
      };
      const data = await apiRequest("/api/students/profile", {
        method: "PATCH",
        token,
        body: payload,
      });
      setForm((current) => ({
        ...current,
        ...data,
        phone: data.phone || "",
        date_of_birth: data.date_of_birth || "",
      }));
      setState((current) => ({ ...current, saving: false, success: "Profile updated successfully." }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
    }
  };

  return (
    <section className="student-profile-page">
      <Card className="student-dashboard-welcome student-antd-card" variant="borderless">
        <div className="student-dashboard-welcome-row">
          <div>
            <Typography.Title level={3} className="student-dashboard-title">
              Your profile
            </Typography.Title>
            <Typography.Paragraph className="student-dashboard-subtitle">
              Keep your personal and academic details up to date so diagnostics and study planning stay relevant.
            </Typography.Paragraph>
          </div>
        </div>
      </Card>

      <FormMessage>{state.error}</FormMessage>
      {state.success ? <div className="message message-success">{state.success}</div> : null}

      <Card className="student-dashboard-focus student-antd-card" variant="borderless">
        {state.loading ? (
          <div className="study-plan-empty">Loading profile...</div>
        ) : (
          <form className="student-profile-form" onSubmit={handleSubmit}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <label className="student-profile-label">Email</label>
                <Input value={form.email} size="large" disabled />
              </Col>
              <Col xs={24} md={12}>
                <label className="student-profile-label">Phone</label>
                <Input
                  value={form.phone}
                  size="large"
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </Col>
              <Col xs={24} md={12}>
                <label className="student-profile-label">Full name</label>
                <Input
                  value={form.full_name}
                  size="large"
                  onChange={(event) => updateField("full_name", event.target.value)}
                />
              </Col>
              <Col xs={24} md={12}>
                <label className="student-profile-label">Class</label>
                <Input
                  value={form.class_name}
                  size="large"
                  onChange={(event) => updateField("class_name", event.target.value)}
                />
              </Col>
              <Col xs={24} md={12}>
                <label className="student-profile-label">Date of birth</label>
                <DatePicker
                  size="large"
                  format="MM/DD/YYYY"
                  value={form.date_of_birth ? dayjs(form.date_of_birth) : null}
                  onChange={(value) => updateField("date_of_birth", value ? value.format("YYYY-MM-DD") : "")}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} md={12}>
                <label className="student-profile-label">Board</label>
                <Input
                  value={form.board}
                  size="large"
                  onChange={(event) => updateField("board", event.target.value)}
                />
              </Col>
              <Col xs={24}>
                <label className="student-profile-label">School name</label>
                <Input
                  value={form.school_name}
                  size="large"
                  onChange={(event) => updateField("school_name", event.target.value)}
                />
              </Col>
              <Col xs={24}>
                <div className="student-profile-exam-panel">
                  <div className="student-profile-exam-panel-head">
                    <div>
                      <Typography.Title level={4}>Exam planning</Typography.Title>
                      <Typography.Paragraph>
                        Set the main exam goal first, then add a backup option if needed.
                      </Typography.Paragraph>
                    </div>
                  </div>

                  <div className="student-profile-exam-grid">
                    <div className="student-profile-exam-main">
                      <label className="student-profile-label">Primary target exam</label>
                      <Input
                        value={form.primary_target_exam}
                        size="large"
                        placeholder="Enter your main target exam"
                        onChange={(event) => updateField("primary_target_exam", event.target.value)}
                      />
                      <label className="student-profile-label student-profile-secondary-label">Secondary target exam</label>
                      <Input
                        value={form.secondary_target_exam}
                        size="large"
                        placeholder="Optional backup exam"
                        onChange={(event) => updateField("secondary_target_exam", event.target.value)}
                      />
                    </div>

                    <div className="student-profile-exam-ai">
                      <div className="student-profile-suggestion">
                        <div className="student-profile-suggestion-copy">
                          <BulbOutlined />
                          {examSuggestion.data?.suggestions?.length ? (
                            <>
                              <span>AI suggested exams based on the current profile.</span>
                              <small>
                                Review the ranked options below and apply the one that fits the student best.
                                {examSuggestion.data.generatedAt ? ` Saved from the last AI run.` : ""}
                              </small>
                            </>
                          ) : (
                            <>
                              <span>Get an AI-suggested exam from the student's class and age.</span>
                              <small>
                                Add class and date of birth for better suggestions. Board and school improve context.
                              </small>
                            </>
                          )}
                        </div>
                        <div className="student-profile-suggestion-actions">
                          <Button
                            className="student-profile-suggestion-action"
                            type="link"
                            loading={examSuggestion.loading}
                            onClick={handleFetchPrimaryExamSuggestion}
                          >
                            {examSuggestion.data?.suggestions?.length ? "Refresh suggestion" : "Ask AI"}
                          </Button>
                        </div>
                      </div>
                      {examSuggestion.error ? <FormMessage>{examSuggestion.error}</FormMessage> : null}
                      {examSuggestion.data?.suggestions?.length ? (
                        <div className="student-profile-suggestion-list">
                          {examSuggestion.data.suggestions.map((suggestion, index) => (
                            <div className="student-profile-suggestion-item" key={`${suggestion.suggested_exam}-${index}`}>
                              <div className="student-profile-suggestion-item-copy">
                                <strong>{suggestion.suggested_exam}</strong>
                                <span>{suggestion.reason}</span>
                              </div>
                              <div className="student-profile-suggestion-item-actions">
                                <span className={`student-profile-confidence student-profile-confidence-${suggestion.confidence}`}>
                                  {suggestion.confidence}
                                </span>
                                <Button
                                  className="student-profile-suggestion-action"
                                  type="default"
                                  onClick={() => applySuggestion("primary_target_exam", suggestion.suggested_exam)}
                                >
                                  Set as primary
                                </Button>
                                <Button
                                  className="student-profile-suggestion-action"
                                  type="default"
                                  onClick={() => applySuggestion("secondary_target_exam", suggestion.suggested_exam)}
                                >
                                  Set as secondary
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
            <div className="student-profile-actions">
              <Button
                className="button button-primary"
                htmlType="submit"
                loading={state.saving}
                size="large"
              >
                Save profile
              </Button>
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}

export default StudentProfilePage;
