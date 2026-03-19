import { useEffect, useState } from "react";
import {
  AlertOutlined,
  HeartOutlined,
  BulbOutlined,
  BookOutlined,
  RadarChartOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../lib/api.js";
import AppRouteLoader from "../components/AppRouteLoader.jsx";
import { useAuth } from "../state/AuthContext.jsx";

function StudentDashboardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [summaryState, setSummaryState] = useState({ loading: true, error: "" });
  const [subjects, setSubjects] = useState([]);
  const [subjectsState, setSubjectsState] = useState({ loading: true, error: "" });
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [diagnosticForm, setDiagnosticForm] = useState({ subject_id: "", exam_id: "" });
  const [diagnosticState, setDiagnosticState] = useState({ loading: false, error: "", success: "" });
  const [topicSearch, setTopicSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsInitialLoadComplete(false);

    async function loadSummary() {
      setSummaryState({ loading: true, error: "" });
      try {
        const data = await apiRequest("/api/students/dashboard-summary", { token });
        if (isMounted) {
          setSummary(data);
          setSummaryState({ loading: false, error: "" });
        }
      } catch (requestError) {
        if (isMounted) {
          setSummaryState({ loading: false, error: requestError.message });
        }
      }
    }

    async function loadSubjects() {
      setSubjectsState({ loading: true, error: "" });
      try {
        const data = await apiRequest("/api/diagnostic/subjects", { token });
        if (isMounted) {
          setSubjects(data);
          const firstSubject = data[0];
          setDiagnosticForm((current) => ({
            subject_id: current.subject_id || firstSubject?.id || "",
            exam_id: current.exam_id || firstSubject?.exams?.[0]?.id || "",
          }));
          setSubjectsState({ loading: false, error: "" });
        }
      } catch (requestError) {
        if (isMounted) {
          setSubjectsState({ loading: false, error: requestError.message });
        }
      }
    }

    async function loadDashboard() {
      await Promise.allSettled([loadSummary(), loadSubjects()]);
      if (isMounted) {
        setIsInitialLoadComplete(true);
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const latest = summary?.latest_learning_health;
  const weakConcepts = summary?.weak_concepts ?? [];
  const recentAttempts = summary?.recent_attempts ?? [];
  const welcomeName = summary?.full_name || "Student";
  const filteredWeakConcepts = weakConcepts.filter((concept) => {
    const query = topicSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      concept.concept_name.toLowerCase().includes(query) ||
      concept.subject_name.toLowerCase().includes(query)
    );
  });
  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: `${subject.name} (${subject.question_count} questions)`,
  }));
  const selectedSubject = subjects.find((subject) => subject.id === diagnosticForm.subject_id) ?? null;
  const examOptions = (selectedSubject?.exams ?? []).map((exam) => ({
    value: exam.id,
    label: exam.name,
  }));
  const isDashboardLoading = !isInitialLoadComplete;

  const handleDiagnosticSubmit = async () => {
    setDiagnosticState({ loading: true, error: "", success: "" });
    try {
      const data = await apiRequest("/api/diagnostic/start", {
        method: "POST",
        token,
        body: diagnosticForm,
      });
      setDiagnosticState({
        loading: false,
        error: "",
        success: `Diagnostic session created with attempt id ${data.id}.`,
      });
      navigate(`/student/diagnostic/${data.id}`);
    } catch (requestError) {
      setDiagnosticState({ loading: false, error: requestError.message, success: "" });
    }
  };

  if (isDashboardLoading) {
    return <AppRouteLoader label="Loading dashboard" />;
  }

  return (
    <div className="student-dashboard-page student-dashboard-antd">
      <Card className="student-dashboard-welcome student-antd-card" variant="borderless">
        <div className="student-dashboard-welcome-row">
          <div>
            <Typography.Title level={3} className="student-dashboard-title">
              Welcome back, {welcomeName}.
            </Typography.Title>
            <Typography.Paragraph className="student-dashboard-subtitle">
              Focus on your next step, track your learning health, and keep your recent progress in one place.
            </Typography.Paragraph>
          </div>
          <div className="student-dashboard-welcome-meta-card">
            <div className="student-dashboard-welcome-meta">
              <span>Class</span>
              <strong>{summary?.class_name || "Not set"}</strong>
            </div>
            <div className="student-dashboard-welcome-meta">
              <span>Snapshot</span>
              <strong>{latest?.snapshot_date ? `Updated ${latest.snapshot_date}` : "No recent snapshot"}</strong>
            </div>
          </div>
        </div>
        <div className="student-dashboard-inline-summary">
          <Card className="student-summary-card student-summary-card-inline student-antd-card" variant="borderless">
            <div className="student-summary-card-head">
              <span className="student-summary-icon" aria-hidden="true">
                <HeartOutlined />
              </span>
              <span className="student-summary-card-label">Learning health</span>
            </div>
            <Statistic
              title=""
              value={summaryState.loading ? "--" : latest?.health_score ?? "N/A"}
              suffix={latest?.health_score != null ? "/100" : ""}
            />
            <Typography.Paragraph>
              Your overall signal based on accuracy, coverage, and consistency.
            </Typography.Paragraph>
          </Card>
          <Card className="student-summary-card student-summary-card-inline student-antd-card" variant="borderless">
            <div className="student-summary-card-head">
              <span className="student-summary-icon" aria-hidden="true">
                <RadarChartOutlined />
              </span>
              <span className="student-summary-card-label">Coverage</span>
            </div>
            <Statistic
              title=""
              value={summaryState.loading ? "--" : latest?.coverage_score ?? "N/A"}
              suffix={latest?.coverage_score != null ? "/100" : ""}
            />
            <Typography.Paragraph>
              Shows how much of your concept map is being actively tested.
            </Typography.Paragraph>
          </Card>
          <Card className="student-summary-card student-summary-card-inline student-antd-card" variant="borderless">
            <div className="student-summary-card-head">
              <span className="student-summary-icon" aria-hidden="true">
                <AlertOutlined />
              </span>
              <span className="student-summary-card-label">Weak concepts</span>
            </div>
            <Statistic title="" value={weakConcepts.length} />
            <Typography.Paragraph>
              Topics to revise next so you improve faster with focused practice.
            </Typography.Paragraph>
          </Card>
        </div>
      </Card>

      {(summaryState.error || subjectsState.error || diagnosticState.error || diagnosticState.success) ? (
        <Space orientation="vertical" size={12} className="student-dashboard-alerts">
          {summaryState.error ? <Alert type="error" showIcon title={summaryState.error} /> : null}
          {subjectsState.error ? <Alert type="error" showIcon title={subjectsState.error} /> : null}
          {diagnosticState.error ? <Alert type="error" showIcon title={diagnosticState.error} /> : null}
          {diagnosticState.success ? <Alert type="success" showIcon title={diagnosticState.success} /> : null}
        </Space>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="student-dashboard-focus student-antd-card" variant="borderless">
            <div className="student-surface-head">
              <div>
                <Typography.Title level={4}>Start your next diagnostic</Typography.Title>
                <Typography.Paragraph>
                  Pick a subject and begin a short session to update your weak areas and learning health.
                </Typography.Paragraph>
              </div>
            </div>
            <div className="student-diagnostic-controls">
              <Select
                value={diagnosticForm.subject_id || undefined}
                onChange={(value) => {
                  const nextSubject = subjects.find((subject) => subject.id === value) ?? null;
                  setDiagnosticForm({
                    subject_id: value,
                    exam_id: nextSubject?.exams?.[0]?.id || "",
                  });
                }}
                options={subjectOptions}
                placeholder="Choose a subject"
                className="student-select student-select-subject"
                size="large"
              />
              <Select
                value={diagnosticForm.exam_id || undefined}
                onChange={(value) => setDiagnosticForm((current) => ({ ...current, exam_id: value }))}
                options={examOptions}
                placeholder="Choose an exam"
                className="student-select student-select-exam"
                size="large"
                disabled={!selectedSubject || examOptions.length === 0}
              />
              <Button
                className="student-primary-button"
                type="primary"
                size="large"
                loading={diagnosticState.loading}
                disabled={subjects.length === 0 || !diagnosticForm.exam_id}
                onClick={handleDiagnosticSubmit}
              >
                Start diagnostic
              </Button>
            </div>
            <div className="student-dashboard-helptext">
              {subjects.length === 0 ? (
                "No subjects are available yet."
              ) : examOptions.length === 0 ? (
                "This subject does not have exam-linked questions yet."
              ) : (
                <>
                  <BulbOutlined className="student-help-icon" />
                  <span>Choose the exam you are currently targeting before starting.</span>
                </>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="student-dashboard-streak student-antd-card" variant="borderless">
            <Typography.Title level={5}>Stay consistent</Typography.Title>
            <Progress
              percent={Math.min((summary?.streak?.current_streak_days ?? 0) * 10, 100)}
              strokeColor="#1677ff"
              showInfo={false}
            />
            <div className="student-streak-stats">
              <div>
                <strong>{summary?.streak?.current_streak_days ?? 0} days</strong>
                <span>Current streak</span>
              </div>
              <div>
                <strong>{summary?.streak?.best_streak_days ?? 0} days</strong>
                <span>Best streak</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="student-surface-card student-surface-card-wide student-antd-card" variant="borderless">
        <div className="student-surface-head">
          <div>
            <Typography.Title level={4}>Topics to revise</Typography.Title>
            <Typography.Paragraph>
              These are the concepts currently needing the most support.
            </Typography.Paragraph>
          </div>
          <Input
            allowClear
            value={topicSearch}
            onChange={(event) => setTopicSearch(event.target.value)}
            placeholder="Search topics"
            prefix={<SearchOutlined />}
            className="student-topic-search"
          />
        </div>
        {weakConcepts.length === 0 && !summaryState.loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Finish a diagnostic to see weak concepts here."
          />
        ) : filteredWeakConcepts.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No topics matched your search."
          />
        ) : (
          <div className="student-topic-row">
            {filteredWeakConcepts.map((concept) => (
              <div className="student-topic-card" key={`${concept.subject_name}-${concept.concept_name}`}>
                <div className="student-topic-card-head">
                  <Tag className="student-topic-pill">{concept.subject_name}</Tag>
                </div>
                <div className="student-topic-card-copy">
                  <Typography.Text strong>{concept.concept_name}</Typography.Text>
                  <Typography.Text type="secondary">
                    Strengthen this concept with focused revision and targeted practice sessions.
                  </Typography.Text>
                </div>
                <div className="student-topic-chip-row">
                  <span className="student-topic-chip">Mastery</span>
                  <span className="student-topic-chip">Revision</span>
                  <span className="student-topic-chip">{concept.subject_name}</span>
                </div>
                <div className="student-topic-outcome">
                  <span>Outcome</span>
                  <div className="student-topic-outcome-row">
                    <p>Current mastery level</p>
                    <strong>{concept.mastery_score}%</strong>
                  </div>
                </div>
                <div className="student-topic-guidance">
                  <span>Let&apos;s plan your study to push this score beyond 90%.</span>
                  <Button
                    className="student-topic-action"
                    type="link"
                    icon={<BookOutlined />}
                    onClick={() =>
                      navigate(
                        `/student/study-plan?concept=${encodeURIComponent(concept.concept_name)}`
                      )
                    }
                  >
                    Study planner
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="student-surface-card student-surface-card-light student-antd-card" variant="borderless">
        <div className="student-surface-head student-surface-head-light">
          <div>
            <Typography.Title level={4}>Recent diagnostics</Typography.Title>
            <Typography.Paragraph>
              Review your latest attempts and keep your momentum moving.
            </Typography.Paragraph>
          </div>
        </div>
        {recentAttempts.length === 0 && !summaryState.loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No diagnostics yet. Start your first one above."
          />
        ) : (
          <List
            className="student-recent-list"
            itemLayout="horizontal"
            dataSource={recentAttempts}
            renderItem={(entry) => (
              <List.Item className="student-dashboard-list-item student-dashboard-list-item-light">
                <div className="student-recent-list-content">
                  <div>
                    <Typography.Text strong>{entry.subject_name}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary">
                      {entry.status} | started {new Date(entry.started_at).toLocaleString()}
                    </Typography.Text>
                  </div>
                  <Tag color="blue">
                    {entry.score_percent != null ? `${entry.score_percent}%` : entry.status}
                  </Tag>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default StudentDashboardPage;
