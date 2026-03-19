import { useEffect, useMemo, useState } from "react";
import { Button, Spin, message } from "antd";
import { useNavigate } from "react-router-dom";

import {
  fetchExams,
  fetchSubjects,
  getSelectedFlow,
  unlockRetest,
} from "../lib/studentFlowApi.js";

function StudentPaymentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selection] = useState(() => getSelectedFlow());
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!selection.examId) {
        navigate("/student", { replace: true });
        return;
      }

      setLoading(true);
      try {
        const [examData, subjectData] = await Promise.all([fetchExams(), fetchSubjects(selection.examId)]);
        if (cancelled) {
          return;
        }
        setExams(examData);
        setSubjects(subjectData);
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
  }, [navigate, selection.examId]);

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

  if (!selectedExam || !selectedSubject) {
    return null;
  }

  const handlePayment = async () => {
    setPaying(true);
    try {
      await unlockRetest(selectedExam.id, selectedSubject.id);
      message.success(`Payment received. Retest unlocked for ${selectedSubject.name}.`);
      navigate("/student/start");
    } catch (error) {
      message.error(error.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="student-flow-page">
      <section className="student-flow-hero panel">
        <div>
          <span className="eyebrow">Module 6</span>
          <h1>Unlock the next test</h1>
          <p>Use the backend payment-unlock endpoint to add one retest credit for this subject.</p>
        </div>
      </section>

      <section className="student-flow-detail-grid">
        <article className="panel student-flow-card student-flow-card-compact">
          <h2>Payment summary</h2>
          <div className="student-flow-stat-list">
            <div>
              <span>Exam</span>
              <strong>{selectedExam.name}</strong>
            </div>
            <div>
              <span>Subject</span>
              <strong>{selectedSubject.name}</strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>Rs. {selectedExam.retest_price}</strong>
            </div>
          </div>
        </article>

        <article className="panel student-flow-card student-flow-card-compact">
          <h2>Unlock retest credit</h2>
          <p>
            One successful payment adds one retest credit for the selected exam and subject. That
            credit is consumed when the next test starts.
          </p>
          <Button className="button button-primary" loading={paying} onClick={handlePayment}>
            Pay Rs. {selectedExam.retest_price}
          </Button>
        </article>
      </section>
    </div>
  );
}

export default StudentPaymentPage;
