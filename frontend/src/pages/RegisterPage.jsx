import { useMemo, useState } from "react";
import { Button, DatePicker, Input, Select } from "antd";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import FormMessage from "../components/FormMessage.jsx";
import heroLearningImage from "../assets/learning_01.png";
import { apiRequest } from "../lib/api.js";
import quadraviseLogo from "../assets/quadravise_logo.png";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "student",
  phone: "",
  class_name: "",
  date_of_birth: "",
  board: "",
  school_name: "",
  primary_target_exam: "",
  secondary_target_exam: "",
  relationship_to_student: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isStudent = form.role === "student";
  const helperText = useMemo(
    () =>
      isStudent
        ? "Student registration creates the base profile used by diagnostics and learning-health tracking."
        : "Guardian registration prepares the account for invite and linked-student creation flows.",
    [isStudent],
  );

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone,
      };

      if (isStudent) {
        payload.class_name = form.class_name;
        payload.date_of_birth = form.date_of_birth || null;
        payload.board = form.board;
        payload.school_name = form.school_name;
        payload.primary_target_exam = form.primary_target_exam;
        payload.secondary_target_exam = form.secondary_target_exam;
      } else {
        payload.relationship_to_student = form.relationship_to_student;
      }

      await apiRequest("/api/auth/register", {
        method: "POST",
        body: payload,
      });
      setSuccess("Registration completed. You can log in now.");
      window.setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-shell">
      <div className="auth-page auth-redesign register-redesign">
        <section
          className="auth-visual-panel register-visual-panel"
          style={{ backgroundImage: `url(${heroLearningImage})` }}
        >
          <div className="auth-visual-overlay">
            <div className="auth-brand-lockup">
              <img src={quadraviseLogo} alt="Quadravise logo" className="auth-brand-logo" />
              <div>
                <strong>QuadraILearn</strong>
                <small>Learning intelligence platform</small>
              </div>
            </div>
            <div className="auth-visual-copy">
              <span className="eyebrow auth-eyebrow">Create your account</span>
              <h1>Start your learning workspace.</h1>
              <p>
                Create a student or guardian account to begin diagnostics, track learning health,
                and make progress visible in one place.
              </p>
              <div className="auth-visual-metrics">
                <div className="auth-metric-tile">
                  <strong>Student setup</strong>
                  <small>Grade-level details support diagnostics and readiness tracking.</small>
                </div>
                <div className="auth-metric-tile">
                  <strong>Guardian setup</strong>
                  <small>Prepare invites and linked-student visibility after sign in.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card-panel">
          <div className="auth-card register-card">
            <div className="auth-card-head">
              <h2>Create account</h2>
              <p>{helperText}</p>
            </div>
            <form className="form-grid auth-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <Input id="name" name="name" size="large" value={form.name} onChange={handleChange} required />
                </div>
                <div className="field">
                  <label htmlFor="role">Role</label>
                  <Select
                    id="role"
                    size="large"
                    value={form.role}
                    onChange={(value) => updateField("role", value)}
                    options={[
                      { value: "student", label: "Student" },
                      { value: "guardian", label: "Guardian" },
                    ]}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    size="large"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <Input id="phone" name="phone" size="large" value={form.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <Input.Password
                  id="password"
                  name="password"
                  size="large"
                  minLength="8"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  visibilityToggle={{
                    visible: showPassword,
                    onVisibleChange: setShowPassword,
                  }}
                  required
                />
              </div>

              {isStudent ? (
                <>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="class_name">Class name</label>
                      <Input
                        id="class_name"
                        name="class_name"
                        size="large"
                        value={form.class_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="board">Board</label>
                      <Input id="board" name="board" size="large" value={form.board} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="date_of_birth">Date of birth</label>
                      <DatePicker
                        id="date_of_birth"
                        size="large"
                        format="MM/DD/YYYY"
                        value={form.date_of_birth ? dayjs(form.date_of_birth) : null}
                        onChange={(value) => updateField("date_of_birth", value ? value.format("YYYY-MM-DD") : "")}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="school_name">School name</label>
                      <Input
                        id="school_name"
                        name="school_name"
                        size="large"
                        value={form.school_name}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="primary_target_exam">Primary target exam</label>
                      <Input
                        id="primary_target_exam"
                        name="primary_target_exam"
                        size="large"
                        value={form.primary_target_exam}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="secondary_target_exam">Secondary target exam</label>
                      <Input
                        id="secondary_target_exam"
                        name="secondary_target_exam"
                        size="large"
                        value={form.secondary_target_exam}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="field">
                  <label htmlFor="relationship_to_student">Relationship to student</label>
                  <Input
                    id="relationship_to_student"
                    name="relationship_to_student"
                    size="large"
                    value={form.relationship_to_student}
                    onChange={handleChange}
                  />
                </div>
              )}

              <FormMessage>{error}</FormMessage>
              <FormMessage type="success">{success}</FormMessage>
              <Button className="button button-primary auth-submit" htmlType="submit" loading={loading} size="large">
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <p className="auth-footer-note">
              Already registered? <Link to="/login">Login</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
