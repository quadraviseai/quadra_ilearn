import { useState } from "react";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";

import FormMessage from "../components/FormMessage.jsx";
import GoogleAuthButton from "../components/GoogleAuthButton.jsx";
import heroLearningImage from "../assets/learning_01.png";
import { getRoleHomePath } from "../lib/roles.js";
import quadraviseLogo from "../assets/quadravise_logo.png";
import { useAuth } from "../state/AuthContext.jsx";

function LoginPage() {
  const { login, authenticateWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError("Enter your email and password.");
      return;
    }

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

  const handleGoogleSignIn = async (credential) => {
    setLoading(true);
    setError("");

    try {
      const session = await authenticateWithGoogle({
        credential,
        intent: "login",
      });
      const destination = location.state?.from || getRoleHomePath(session.user.role);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-shell auth-login-shell">
      <div className="auth-login-page" style={{ backgroundImage: `url(${heroLearningImage})` }}>
        <div className="auth-login-backdrop" />
        <section className="auth-login-layout">
          <div className="auth-login-copy">
            <div className="auth-brand-lockup auth-brand-lockup-login">
              <img src={quadraviseLogo} alt="Quadravise logo" className="auth-brand-logo" />
              <div>
                <strong>QuadraILearn</strong>
                <small>Learning intelligence platform</small>
              </div>
            </div>
            <h1>Enter QuadraILearn and continue your exam path.</h1>
            <p>
              Sign in to choose your exam, resume a live 30-question mock test, review weak-topic
              analysis, and unlock the next retest when you need it.
            </p>
            <div className="auth-login-proof">
              <div className="auth-login-proof-card">
                <strong>30 questions</strong>
                <small>One focused test flow</small>
              </div>
              <div className="auth-login-proof-card">
                <strong>Instant save</strong>
                <small>Resume without losing progress</small>
              </div>
              <div className="auth-login-proof-card">
                <strong>Weak-topic report</strong>
                <small>Learn and retest quickly</small>
              </div>
            </div>
          </div>

          <div className="auth-login-card panel">
            <div className="auth-login-card-top">
              <h2>Welcome back</h2>
            </div>

            <form className="form-grid auth-form auth-login-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  size="large"
                  prefix={<MailOutlined />}
                  inputMode="email"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="name@domain.com"
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
                  prefix={<LockOutlined />}
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <FormMessage>{error}</FormMessage>
              <Button className="button button-primary auth-submit auth-login-submit" htmlType="submit" loading={loading} size="large">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <div className="auth-divider auth-login-divider">
                <span>or</span>
              </div>
              <GoogleAuthButton buttonText="signin_with" disabled={loading} onCredential={handleGoogleSignIn} />
            </form>

            <div className="auth-login-footer">
              <span><Link to="/forgot-password">Forgot password?</Link></span>
            </div>

            <div className="auth-login-footer">
              <span>Need a new account?</span>
              <Link to="/register">Create one</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
