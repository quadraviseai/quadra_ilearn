import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, ReadOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Modal, Segmented, Statistic, Table, Tag, Typography } from "antd";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "Completed", value: "completed" },
];

function StudentStudyPlanPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plan, setPlan] = useState(null);
  const [state, setState] = useState({ loading: true, error: "", regenerating: false, savingTaskId: "" });
  const [activeFilter, setActiveFilter] = useState("all");
  const [examModal, setExamModal] = useState({ open: false, taskId: "", selectedExam: "", generatedExams: [] });
  const conceptFilter = searchParams.get("concept")?.trim() || "";

  const loadPlan = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await apiRequest("/api/study-planner/", { token });
      setPlan(data);
      setState((current) => ({ ...current, loading: false, error: "" }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  useEffect(() => {
    loadPlan();
  }, [token]);

  const allTasks = plan?.tasks ?? [];
  const conceptTasks = conceptFilter
    ? allTasks.filter((task) => (task.concept_name || "").toLowerCase() === conceptFilter.toLowerCase())
    : allTasks;
  const baseTasks = conceptTasks.length > 0 ? conceptTasks : allTasks;

  const visibleTasks = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 6);
    const weekKey = weekLater.toISOString().slice(0, 10);

    return baseTasks.filter((task) => {
      if (activeFilter === "completed") {
        return task.status === "done";
      }
      if (activeFilter === "today") {
        return task.scheduled_date === todayKey && task.status !== "done";
      }
      if (activeFilter === "week") {
        return task.scheduled_date >= todayKey && task.scheduled_date <= weekKey && task.status !== "done";
      }
      return true;
    });
  }, [activeFilter, baseTasks]);

  const totalMinutes = visibleTasks.reduce((sum, task) => sum + (task.estimated_minutes || 0), 0);
  const completedCount = allTasks.filter((task) => task.status === "done").length;
  const availableExams = [plan?.primary_target_exam, plan?.secondary_target_exam].filter(Boolean);

  const getGeneratedExamsForTask = (task) => {
    const examContent = task?.ai_study_content?.exam_content;
    if (examContent && typeof examContent === "object") {
      return Object.keys(examContent).filter((exam) => examContent[exam]?.overview);
    }

    const legacyExam = task?.ai_study_content?.target_exam;
    return legacyExam && task?.ai_study_content?.overview ? [legacyExam] : [];
  };

  const tableColumns = [
    {
      title: "Concept",
      dataIndex: "concept_name",
      key: "concept_name",
      render: (value) => <Tag className="study-plan-task-pill">{value || "General task"}</Tag>,
    },
    {
      title: "Task",
      dataIndex: "title",
      key: "title",
      render: (value, record) => (
        <div className="study-plan-table-task">
          <strong>{value}</strong>
          <span>{record.description}</span>
        </div>
      ),
    },
    {
      title: "Date",
      dataIndex: "scheduled_date",
      key: "scheduled_date",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag color={value === "done" ? "green" : value === "skipped" ? "default" : value === "in_progress" ? "orange" : "blue"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Duration",
      dataIndex: "estimated_minutes",
      key: "estimated_minutes",
      render: (value) => `${value} min`,
    },
    {
      title: "Action",
      key: "action",
      render: (_, task) => (
        <Button
          className="study-plan-inline-action"
          icon={<ReadOutlined />}
          onClick={() =>
            setExamModal({
              open: true,
              taskId: task.id,
              selectedExam: plan?.primary_target_exam || plan?.secondary_target_exam || "",
              generatedExams: getGeneratedExamsForTask(task),
            })
          }
        >
          {task.ai_study_content?.overview ? "Open study" : "Start study"}
        </Button>
      ),
    },
  ];

  return (
    <section className="study-plan-page">
      <Card className="study-plan-hero student-antd-card" variant="borderless">
        <div className="study-plan-hero-head">
          <div>
            <span className="eyebrow study-plan-eyebrow">Study planner</span>
            <Typography.Title level={2} className="study-plan-title">
              Build a smarter revision rhythm
            </Typography.Title>
            <Typography.Paragraph className="study-plan-subtitle">
              Your plan is generated from weak concepts and recent diagnostics so you can study with more focus.
            </Typography.Paragraph>
          </div>
        </div>
        <div className="study-plan-metrics">
          <div className="study-plan-metric">
            <BookOutlined className="study-plan-metric-icon" />
            <Statistic title="" value={visibleTasks.length} suffix="tasks" />
          </div>
          <div className="study-plan-metric">
            <ClockCircleOutlined className="study-plan-metric-icon" />
            <Statistic title="" value={totalMinutes} suffix="min" />
          </div>
          <div className="study-plan-metric">
            <CheckCircleOutlined className="study-plan-metric-icon" />
            <Statistic title="" value={completedCount} suffix="done" />
          </div>
        </div>
      </Card>

      <FormMessage>{state.error}</FormMessage>

      {conceptFilter && !state.loading && plan && conceptTasks.length === 0 ? (
        <div className="study-plan-filter-banner">
          No direct study-plan tasks found for <strong>{conceptFilter}</strong> yet. Showing the full plan below.
        </div>
      ) : null}

      <div className="study-plan-toolbar study-plan-toolbar-surface">
        <div>
          <Typography.Title level={4} className="study-plan-section-title">
            Planned study tasks
          </Typography.Title>
          <Typography.Paragraph className="study-plan-section-copy">
            Start with the highest-friction concepts and move through the plan step by step.
          </Typography.Paragraph>
        </div>
        <Segmented
          className="study-plan-filter-control"
          options={FILTER_OPTIONS}
          value={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      <div className="study-plan-layout">
        <Card className="study-plan-board study-plan-board-surface student-antd-card" variant="borderless">
          {state.loading ? <div className="study-plan-empty">Loading study plan...</div> : null}
          {!state.loading && !plan ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No study plan available yet. Complete a diagnostic first."
            />
          ) : null}
          {!state.loading && plan && visibleTasks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No tasks matched this filter."
            />
          ) : null}
          {!state.loading && plan && visibleTasks.length > 0 ? (
            <Table
              className="study-plan-table"
              rowKey="id"
              columns={tableColumns}
              dataSource={visibleTasks}
              pagination={false}
            />
          ) : null}
        </Card>
      </div>

      <Modal
        open={examModal.open}
        onCancel={() => setExamModal({ open: false, taskId: "", selectedExam: "", generatedExams: [] })}
        onOk={() => {
          if (examModal.taskId && examModal.selectedExam) {
            navigate(`/student/study-plan/tasks/${examModal.taskId}?exam=${encodeURIComponent(examModal.selectedExam)}`);
            setExamModal({ open: false, taskId: "", selectedExam: "", generatedExams: [] });
          }
        }}
        okText="Continue"
        okButtonProps={{ disabled: !examModal.selectedExam }}
        title="Choose target exam"
      >
        <Typography.Paragraph>
          Select the exam you want this study session to focus on.
        </Typography.Paragraph>
        <div className="study-plan-exam-picker">
          {availableExams.map((exam) => {
            const isSelected = examModal.selectedExam === exam;
            const isGenerated = examModal.generatedExams.includes(exam);

            return (
              <button
                type="button"
                key={exam}
                className={`study-plan-exam-option${isSelected ? " selected" : ""}`}
                onClick={() => setExamModal((current) => ({ ...current, selectedExam: exam }))}
              >
                <span>{exam}</span>
                {isGenerated ? <Tag color="green">Generated</Tag> : null}
              </button>
            );
          })}
        </div>
        {!availableExams.length ? (
          <Typography.Paragraph type="secondary">
            Add a primary or secondary target exam in your profile first.
          </Typography.Paragraph>
        ) : null}
      </Modal>
    </section>
  );
}

export default StudentStudyPlanPage;
