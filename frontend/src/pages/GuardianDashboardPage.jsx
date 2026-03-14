import { useEffect, useState } from "react";

import FormMessage from "../components/FormMessage.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const inviteInitial = { email: "" };
const createInitial = {
  name: "",
  email: "",
  class_name: "",
  board: "",
  school_name: "",
  target_exam: "",
};

function GuardianDashboardPage() {
  const { token, user } = useAuth();
  const [students, setStudents] = useState([]);
  const [studentsState, setStudentsState] = useState({ loading: true, error: "" });
  const [inviteForm, setInviteForm] = useState(inviteInitial);
  const [inviteState, setInviteState] = useState({ loading: false, error: "", success: "" });
  const [createForm, setCreateForm] = useState(createInitial);
  const [createState, setCreateState] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setStudentsState({ loading: true, error: "" });
      try {
        const data = await apiRequest("/api/guardian/students", { token });
        if (isMounted) {
          setStudents(data);
          setStudentsState({ loading: false, error: "" });
        }
      } catch (requestError) {
        if (isMounted) {
          setStudentsState({ loading: false, error: requestError.message });
        }
      }
    }

    loadStudents();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    setInviteState({ loading: true, error: "", success: "" });
    try {
      const data = await apiRequest("/api/guardian/invite", {
        method: "POST",
        token,
        body: inviteForm,
      });
      setInviteState({
        loading: false,
        error: "",
        success: data.student_exists
          ? `Invite processed. Token: ${data.invite_token}`
          : `Pending invite prepared. Token: ${data.invite_token}`,
      });
      setInviteForm(inviteInitial);
      const refreshed = await apiRequest("/api/guardian/students", { token });
      setStudents(refreshed);
    } catch (requestError) {
      setInviteState({ loading: false, error: requestError.message, success: "" });
    }
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setCreateState({ loading: true, error: "", success: "" });
    try {
      const data = await apiRequest("/api/guardian/create-student", {
        method: "POST",
        token,
        body: createForm,
      });
      setCreateState({
        loading: false,
        error: "",
        success: `Student created: ${data.student_email}. Temporary password: ${data.temporary_password}`,
      });
      setCreateForm(createInitial);
      const refreshed = await apiRequest("/api/guardian/students", { token });
      setStudents(refreshed);
    } catch (requestError) {
      setCreateState({ loading: false, error: requestError.message, success: "" });
    }
  };

  return (
    <>
      <section className="split-actions">
        <div>
          <h1 className="dashboard-title">Guardian workspace</h1>
          <p className="dashboard-subtitle">
            Signed in as {user?.email}. Manage student links and create new learner accounts from here.
          </p>
        </div>
        <div className="status-badge">Phase 1 surface</div>
      </section>

      <div className="dashboard-grid">
        <MetricCard
          className="span-4"
          kicker="Visibility"
          value={studentsState.loading ? "--" : students.length}
          title="Guardian tools connected"
          description="Total linked or invited students available from the backend."
        />

        <MetricCard
          className="span-4"
          kicker="Active links"
          value={students.filter((student) => student.link_status === "active").length}
          title="Active student visibility"
          description="Students already linked and ready for guardian monitoring."
        />

        <MetricCard
          className="span-4"
          kicker="Mode"
          value="MVP"
          title="Action-first dashboard"
          description="The current interface focuses on what guardians can do now rather than placeholder analytics."
        />

        <section className="panel form-card span-6">
          <h3>Invite existing student</h3>
          <p className="form-note">
            Use this when the student already has an account and you want to link visibility.
          </p>
          <form className="form-grid" onSubmit={handleInviteSubmit}>
            <div className="field">
              <label htmlFor="invite-email">Student email</label>
              <input
                id="invite-email"
                name="email"
                type="email"
                value={inviteForm.email}
                onChange={(event) => setInviteForm({ email: event.target.value })}
                required
              />
            </div>
            <FormMessage>{inviteState.error}</FormMessage>
            <FormMessage type="success">{inviteState.success}</FormMessage>
            <button className="button button-primary" type="submit" disabled={inviteState.loading}>
              {inviteState.loading ? "Sending..." : "Send invite"}
            </button>
          </form>
        </section>

        <section className="panel form-card span-6">
          <h3>Create and link student</h3>
          <p className="form-note">
            This uses the guardian-managed account creation endpoint. It currently returns a temporary password.
          </p>
          <form className="form-grid" onSubmit={handleCreateSubmit}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="student-name">Student name</label>
                <input
                  id="student-name"
                  name="name"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="student-email">Student email</label>
                <input
                  id="student-email"
                  name="email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="class-name">Class name</label>
                <input
                  id="class-name"
                  name="class_name"
                  value={createForm.class_name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, class_name: event.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="board">Board</label>
                <input
                  id="board"
                  name="board"
                  value={createForm.board}
                  onChange={(event) => setCreateForm((current) => ({ ...current, board: event.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="school-name">School name</label>
                <input
                  id="school-name"
                  name="school_name"
                  value={createForm.school_name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, school_name: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="target-exam">Target exam</label>
                <input
                  id="target-exam"
                  name="target_exam"
                  value={createForm.target_exam}
                  onChange={(event) => setCreateForm((current) => ({ ...current, target_exam: event.target.value }))}
                />
              </div>
            </div>
            <FormMessage>{createState.error}</FormMessage>
            <FormMessage type="success">{createState.success}</FormMessage>
            <button className="button button-primary" type="submit" disabled={createState.loading}>
              {createState.loading ? "Creating..." : "Create student"}
            </button>
          </form>
        </section>

        <section className="panel status-card span-12">
          <h3>Linked students</h3>
          <FormMessage>{studentsState.error}</FormMessage>
          {!studentsState.error && students.length === 0 && !studentsState.loading ? (
            <p>No students linked yet.</p>
          ) : null}
          <div className="list">
            {students.map((student) => (
              <div className="list-item" key={student.id}>
                <div>
                  <strong>{student.full_name}</strong>
                  <div className="tiny">
                    {student.email} | Class {student.class_name} | {student.link_status}
                  </div>
                  <div className="tiny">
                    Health {student.latest_learning_health?.health_score ?? "N/A"} | Streak {student.streak?.current_streak_days ?? 0} days
                  </div>
                  <div className="tiny">
                    Recent diagnostic: {student.recent_attempt?.subject_name ?? "None"}
                  </div>
                </div>
                <div className="status-badge">
                  {student.latest_learning_health?.snapshot_date ?? "No snapshot"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export default GuardianDashboardPage;
