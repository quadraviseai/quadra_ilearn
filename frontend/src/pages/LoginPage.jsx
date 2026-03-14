import { useState } from "react";
import { Button, Checkbox, Input } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";

import FormMessage from "../components/FormMessage.jsx";
import heroLearningImage from "../assets/learning_01.png";
import { apiRequest } from "../lib/api.js";
import { getRoleHomePath } from "../lib/roles.js";
import quadraviseLogo from "../assets/quadravise_logo.png";
import { useAuth } from "../state/AuthContext.jsx";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await login(form);
      const destination = location.state?.from || getRoleHomePath(session.user.role);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");

    try {
      const response = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: forgotEmail },
      });
      setForgotSuccess(response.message);
    } catch (requestError) {
      setForgotError(requestError.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="page auth-shell">
      <div className="auth-page auth-redesign">
        <section
          className="auth-visual-panel"
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
              <span className="eyebrow auth-eyebrow">Welcome back</span>
              <h1>Return to your learning workspace.</h1>
              <p>
                Students can continue diagnostics and learning health tracking, while guardians can
                review progress and support the next step.
              </p>
              <div className="auth-visual-metrics">
                <div className="auth-metric-tile">
                  <strong>Learning health</strong>
                  <small>Track consistency and concept progress.</small>
                </div>
                <div className="auth-metric-tile">
                  <strong>Guardian view</strong>
                  <small>Stay updated without chasing progress.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card-panel">
          <div className="auth-card">
            <div className="auth-card-head">
              <h2>Login</h2>
              <p>Use the account created from the backend registration flow.</p>
            </div>
            <form className="form-grid auth-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  size="large"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <Input.Password
                  id="password"
                  name="password"
                  size="large"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="auth-form-meta">
                <label className="auth-checkbox">
                  <Checkbox
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  className="auth-inline-link auth-inline-button"
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setForgotEmail("");
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <FormMessage>{error}</FormMessage>
              <Button className="button button-primary auth-submit" htmlType="submit" loading={loading} size="large">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <Button className="button auth-google-button" type="button" size="large" disabled>
                <span className="auth-google-mark">G</span>
                Continue with Google
              </Button>
            </form>
            <p className="auth-footer-note">
              Need a new account? <Link to="/register">Register here</Link>
            </p>
          </div>
        </section>
      </div>
      {forgotOpen ? (
        <div className="auth-modal-backdrop" onClick={() => setForgotOpen(false)}>
          <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-modal-head">
              <h3>Forgot password</h3>
              <button className="auth-modal-close" type="button" onClick={() => setForgotOpen(false)}>
                ×
              </button>
            </div>
            <p className="auth-modal-copy">
              Enter your email address and we will send a password reset link from
              {" "}
              <strong>support@quadravise.com</strong>.
            </p>
            <form className="auth-modal-form" onSubmit={handleForgotPassword}>
              <div className="field">
                <label htmlFor="forgot-email">Email</label>
                <Input
                  id="forgot-email"
                  name="forgot-email"
                  type="email"
                  size="large"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                />
              </div>
              <FormMessage>{forgotError}</FormMessage>
              <FormMessage type="success">{forgotSuccess}</FormMessage>
              <Button className="button button-primary auth-submit" htmlType="submit" loading={forgotLoading} size="large">
                {forgotLoading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LoginPage;
