import { useEffect, useState } from "react";
import { Button, Modal, Select, Spin, message } from "antd";
import { useNavigate } from "react-router-dom";

import {
  fetchActiveAttempt,
  fetchEligibility,
  fetchExams,
  fetchLatestReport,
  fetchSubjects,
  getSelectedFlow,
  setSelectedExam,
  setSelectedFlow,
  startAttempt,
  unlockRetest,
} from "../lib/studentFlowApi.js";

function StudentExamSelectionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentContext, setPaymentContext] = useState(null);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [latestReport, setLatestReport] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [selection, setSelection] = useState(() => getSelectedFlow());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [examData, latestReportData] = await Promise.all([fetchExams(), fetchLatestReport()]);
        if (cancelled) {
          return;
        }

        setExams(examData);
        setLatestReport(latestReportData);

        if (selection.examId) {
          const subjectData = await fetchSubjects(selection.examId);
          if (!cancelled) {
            setSubjects(subjectData);
          }
        } else if (!cancelled) {
          setSubjects([]);
        }

        if (selection.examId && selection.subjectId) {
          const attempt = await fetchActiveAttempt(selection.examId, selection.subjectId);
          if (!cancelled) {
            setActiveAttempt(attempt);
          }
        } else if (!cancelled) {
          setActiveAttempt(null);
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
  }, [selection.examId, selection.subjectId]);

  const handleExamChange = (examId) => {
    setSelection(setSelectedExam(examId));
  };

  const handleSubjectChange = (subjectId) => {
    setSelection((current) => setSelectedFlow(current.examId, subjectId));
  };

  const startSelectedAttempt = async () => {
    const attempt = await startAttempt(selection.examId, selection.subjectId);
    navigate(`/student/attempt/${attempt.id}`);
  };

  const handleStart = async () => {
    if (!selection.examId || !selection.subjectId) {
      message.error("Select your exam and subject first.");
      return;
    }

    if (activeAttempt) {
      navigate(`/student/attempt/${activeAttempt.id}`);
      return;
    }

    setStarting(true);
    try {
      const eligibility = await fetchEligibility(selection.examId, selection.subjectId);

      if (eligibility.payment_required) {
        setPaymentContext(eligibility);
        setPaymentOpen(true);
        return;
      }

      await startSelectedAttempt();
    } catch (error) {
      message.error(error.message);
    } finally {
      setStarting(false);
    }
  };

  const handleTestPayment = async () => {
    const selectedExam = exams.find((exam) => exam.id === selection.examId);
    const selectedSubject = subjects.find((subject) => subject.id === selection.subjectId);

    if (!selectedExam || !selectedSubject) {
      return;
    }

    setPaymentLoading(true);
    try {
      await unlockRetest(selectedExam.id, selectedSubject.id);
      setPaymentOpen(false);
      message.success(`Payment successful. ${selectedSubject.name} is unlocked.`);
      await startSelectedAttempt();
    } catch (error) {
      message.error(error.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <Spin size="large" />;
  }

  const examOptions = exams.map((exam) => ({
    label: exam.name,
    value: exam.id,
  }));

  const subjectOptions = subjects.map((subject) => ({
    label: subject.name,
    value: subject.id,
  }));

  const selectedExam = exams.find((exam) => exam.id === selection.examId) ?? null;
  const selectedSubject = subjects.find((subject) => subject.id === selection.subjectId) ?? null;

  return (
    <div className="student-flow-page">
      <section className="student-flow-launch panel">
        <div className="student-flow-launch-copy">
          <h1>Start your mock test</h1>
          <p>Select your exam and subject, then continue directly to the mock test.</p>

          <div className="student-flow-launch-highlights">
            <article>
              <strong>Sharpen one topic at a time</strong>
              <p>Pick the exam you are targeting and start a focused practice session without distractions.</p>
            </article>
            <article>
              <strong>Turn practice into confidence</strong>
              <p>Each mock test helps you spot weak areas, improve accuracy, and build exam rhythm.</p>
            </article>
            <article>
              <strong>Stay in momentum</strong>
              <p>{activeAttempt ? "Your unfinished attempt is ready to continue." : "Choose a subject now and begin your next attempt."}</p>
            </article>
          </div>
        </div>

        <div className="student-flow-launch-panel">
          <div className="student-flow-launch-panel-head">
            <strong>Select and begin</strong>
            <p>Choose exam, choose subject, then launch the mock test.</p>
          </div>

          <div className="student-flow-launch-controls">
            <label className="student-flow-field">
              <span>Select your exam</span>
              <Select
                value={selection.examId || undefined}
                onChange={handleExamChange}
                options={examOptions}
                placeholder="Select your exam"
                className="student-select student-select-subject"
                size="large"
              />
            </label>

            <label className="student-flow-field">
              <span>Select your subject</span>
              <Select
                value={selection.subjectId || undefined}
                onChange={handleSubjectChange}
                options={subjectOptions}
                placeholder="Select your subject"
                className="student-select student-select-exam"
                size="large"
                disabled={!selection.examId || subjectOptions.length === 0}
              />
            </label>

            <button
              className="button button-primary student-flow-launch-button"
              type="button"
              disabled={starting || !selection.examId || !selection.subjectId}
              onClick={handleStart}
            >
              {starting ? "Starting..." : activeAttempt ? "Continue mock test" : "Start mock test"}
            </button>
          </div>

          {!selection.examId ? <p className="student-flow-simple-note">Choose an exam to load its subjects.</p> : null}
          {selection.examId && subjectOptions.length === 0 ? (
            <p className="student-flow-simple-note">No subjects are mapped to the selected exam yet.</p>
          ) : null}
          {activeAttempt ? (
            <p className="student-flow-simple-note">
              An active test already exists for this exam and subject. Continue instead of creating a new one.
            </p>
          ) : null}
        </div>
      </section>

      {latestReport ? (
        <section className="student-flow-banner panel student-flow-banner-light">
          <div>
            <strong>Latest report</strong>
            <p>
              {latestReport.exam_name} / {latestReport.subject_name} scored{" "}
              {Math.round(Number(latestReport.score_percent || 0))}% with {latestReport.weak_topics.length} weak
              topics identified.
            </p>
          </div>
          <Button onClick={() => navigate("/student/report")}>Open report</Button>
        </section>
      ) : null}

      <Modal
        open={paymentOpen}
        onCancel={() => setPaymentOpen(false)}
        footer={null}
        centered
        title="Continue your mock test"
        className="student-payment-modal-dialog"
      >
        <div className="student-payment-modal">
          <p>
            You have finished your first trial. To continue with your next mock test, complete the
            payment below and you will be redirected straight to the test page.
          </p>
          <div className="student-payment-modal-summary">
            <div>
              <span>Exam</span>
              <strong>{selectedExam?.name || "-"}</strong>
            </div>
            <div>
              <span>Subject</span>
              <strong>{selectedSubject?.name || "-"}</strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>Rs. {selectedExam?.retest_price ?? paymentContext?.amount ?? 0}</strong>
            </div>
          </div>
          <div className="student-payment-modal-actions">
            <Button onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <button className="button button-primary" type="button" disabled={paymentLoading} onClick={handleTestPayment}>
              {paymentLoading ? "Processing payment..." : "Test payment"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StudentExamSelectionPage;
