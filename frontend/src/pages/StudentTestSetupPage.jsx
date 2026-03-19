import { useEffect, useMemo, useState } from "react";
import { Button, Spin, message } from "antd";
import { useNavigate } from "react-router-dom";

import {
  fetchActiveAttempt,
  fetchEligibility,
  fetchExams,
  fetchLatestReport,
  fetchSubjects,
  getSelectedFlow,
  setSelectedFlow,
  startAttempt,
} from "../lib/studentFlowApi.js";

function StudentTestSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selection] = useState(() => getSelectedFlow());
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [latestReport, setLatestReport] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!selection.examId) {
        navigate("/student", { replace: true });
        return;
      }
      if (!selection.subjectId) {
        navigate("/student", { replace: true });
        return;
      }

      setLoading(true);
      try {
        const [examData, subjectData, eligibilityData, activeAttemptData, latestReportData] = await Promise.all([
          fetchExams(),
          fetchSubjects(selection.examId),
          fetchEligibility(selection.examId, selection.subjectId),
          fetchActiveAttempt(selection.examId, selection.subjectId),
          fetchLatestReport(),
        ]);
        if (cancelled) {
          return;
        }
        setExams(examData);
        setSubjects(subjectData);
        setEligibility(eligibilityData);
        setActiveAttempt(activeAttemptData);
        setLatestReport(latestReportData);
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
  }, [navigate, selection.examId, selection.subjectId]);

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selection.examId) ?? null,
    [exams, selection.examId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selection.subjectId) ?? null,
    [selection.subjectId, subjects],
  );

  if (loading) {
    return <Spin size="large" />;
  }

  if (!selectedExam || !selectedSubject || !eligibility) {
    return null;
  }

  const handleStart = async () => {
    try {
      const attempt = await startAttempt(selectedExam.id, selectedSubject.id);
      navigate(`/student/attempt/${attempt.id}`);
    } catch (error) {
      message.error(error.message);
    }
  };

  return (
    <div className="student-flow-page">
      <section className="student-flow-hero panel">
        <div>
          <span className="eyebrow">Modules 3 and 6</span>
          <h1>Check eligibility and start the mock test</h1>
          <p>
            {selectedExam.name} / {selectedSubject.name} is ready. The backend will generate and
            persist a mock test from the available active questions.
          </p>
        </div>
        <div className="student-flow-hero-actions">
          <Button onClick={() => navigate("/student")}>Change subject</Button>
        </div>
      </section>

      <section className="student-flow-detail-grid">
        <article className="panel student-flow-card student-flow-card-compact">
          <h2>Eligibility</h2>
          <p>{eligibility.message}</p>
          <div className="student-flow-stat-list">
            <div>
              <span>Attempt mode</span>
              <strong>{eligibility.free ? "Free first attempt" : "Paid retest"}</strong>
            </div>
            <div>
              <span>Question count</span>
              <strong>{eligibility.question_limit} randomized questions</strong>
            </div>
            <div>
              <span>Answer saving</span>
              <strong>Persisted immediately to backend</strong>
            </div>
          </div>
        </article>

        <article className="panel student-flow-card student-flow-card-compact">
          <h2>Next action</h2>
          {eligibility.resume && activeAttempt ? (
            <>
              <p>You already have an active test for this subject. Continue where you stopped.</p>
              <Button className="button button-primary" onClick={() => navigate(`/student/attempt/${activeAttempt.id}`)}>
                Resume test
              </Button>
            </>
          ) : eligibility.can_start ? (
            <>
              <p>Start now to generate the next test for this exam and subject.</p>
              <Button className="button button-primary" onClick={handleStart}>
                Start mock test
              </Button>
            </>
          ) : (
            <>
              <p>A payment unlock is required before another attempt can start.</p>
              <Button className="button button-primary" onClick={() => navigate("/student/payment")}>
                Pay and unlock retest
              </Button>
            </>
          )}
        </article>
      </section>

      {latestReport ? (
        <section className="student-flow-banner panel student-flow-banner-light">
          <div>
            <strong>Retest flow</strong>
            <p>
              Your latest report in {latestReport.subject_name} is ready. Review weak topics or go
              straight into a retest.
            </p>
          </div>
          <div className="student-flow-inline-actions">
            <Button onClick={() => navigate(`/student/learn?reportId=${latestReport.id}`)}>Learn weak topics</Button>
            <Button
              className="button button-primary"
              onClick={() => {
                setSelectedFlow(latestReport.exam, latestReport.subject);
                navigate("/student/start");
              }}
            >
              Retest now
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default StudentTestSetupPage;
