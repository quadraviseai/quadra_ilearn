import { useEffect, useMemo, useState } from "react";
import { AlertOutlined } from "@ant-design/icons";
import { Button, Spin, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import { fetchLatestReport, fetchReport, setSelectedFlow } from "../lib/studentFlowApi.js";

function StudentReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const reportId = new URLSearchParams(location.search).get("reportId");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = reportId ? await fetchReport(reportId) : await fetchLatestReport();
        if (!cancelled) {
          setReport(data);
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
  }, [reportId]);

  const scorePercent = useMemo(
    () => Math.round(Number(report?.score_percent || 0)),
    [report],
  );

  if (loading) {
    return <Spin size="large" />;
  }

  if (!report) {
    return (
      <div className="student-flow-page">
        <article className="panel student-flow-empty">
          <h2>No report available</h2>
          <p>Submit a test first to generate the report.</p>
          <Button className="button button-primary" onClick={() => navigate("/student")}>
            Go to exams
          </Button>
        </article>
      </div>
    );
  }

  const submittedAt = new Date(report.submitted_at).toLocaleString();
  const weakTopics = report.weak_topics ?? [];
  const headline =
    scorePercent >= 80
      ? "Strong result"
      : scorePercent >= 50
        ? "Good progress"
        : "Keep building momentum";

  return (
    <div className="student-flow-page student-report-page">
      <section className="panel student-report-hero">
        <div className="student-report-hero-copy">
          <h1>{headline}</h1>
          <p>
            {report.exam_name} mock test in {report.subject_name}. Submitted on {submittedAt}.
          </p>
          <div className="student-report-hero-actions">
            <Button onClick={() => navigate(`/student/learn?reportId=${report.id}`)}>Learn</Button>
            <Button
              className="button button-primary"
              onClick={() => {
                setSelectedFlow(report.exam, report.subject);
                navigate("/student/start");
              }}
            >
              Retest
            </Button>
          </div>
        </div>

        <div className="student-report-score-card">
          <span className="student-report-score-label">Your score</span>
          <strong>{scorePercent}%</strong>
          <p>
            {report.correct_answers} correct out of {report.total_questions} questions
          </p>
        </div>
      </section>

      <section className="student-report-summary-grid">
        {[
          ["Questions", report.total_questions],
          ["Correct", report.correct_answers],
          ["Wrong", report.wrong_answers],
          ["Unanswered", report.unanswered_answers],
        ].map(([label, value]) => (
          <article key={label} className="panel student-report-summary-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="student-report-layout">
        <article className="panel student-report-card student-report-card-featured">
          <div className="student-report-card-head">
            <div>
              <h2>Weak topics</h2>
            </div>
            <span className="student-report-count-chip">{weakTopics.length}</span>
          </div>

          {weakTopics.length === 0 ? (
            <p className="student-report-muted">No weak topics were detected in this attempt.</p>
          ) : (
            <div className="student-report-topic-list">
              {weakTopics.slice(0, 4).map((topic, index) => (
                <div key={topic.concept_id} className="student-report-topic-row">
                  <div>
                    <span>Priority {index + 1}</span>
                    <strong>{topic.topic}</strong>
                  </div>
                  <div className="student-report-topic-actions">
                    <span className="student-report-miss-indicator" aria-label={`${topic.misses} misses`}>
                      <span className="student-report-miss-indicator-icon" aria-hidden="true">
                        <AlertOutlined />
                      </span>
                      <strong>{topic.misses}</strong>
                    </span>
                    <Button
                      className="button button-primary"
                      size="small"
                      onClick={() => navigate(`/student/learn?reportId=${report.id}&conceptId=${topic.concept_id}`)}
                    >
                      Review & learn
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel student-report-card">
          <div className="student-report-card-head">
            <div>
              <h2>What to do now</h2>
            </div>
          </div>

          <ul className="student-report-step-list">
            <li>Review the weak topics from this report.</li>
            <li>Open learning support for the same subject.</li>
            <li>Retake the mock test when you are ready.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}

export default StudentReportPage;
