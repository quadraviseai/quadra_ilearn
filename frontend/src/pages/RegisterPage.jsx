import { useState } from "react";
import { Button, Input } from "antd";
import { Link, useNavigate } from "react-router-dom";

import FormMessage from "../components/FormMessage.jsx";
import GoogleAuthButton from "../components/GoogleAuthButton.jsx";
import heroLearningImage from "../assets/learning_01.png";
import { apiRequest } from "../lib/api.js";
import { getRoleHomePath } from "../lib/roles.js";
import quadraviseLogo from "../assets/quadravise_logo.png";
import { useAuth } from "../state/AuthContext.jsx";

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  referral_code: "",
};

function RegisterPage() {
  const { authenticateWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Name, email, and password are required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: "student",
          phone: form.phone.trim(),
          referral_code: form.referral_code.trim(),
        },
      });
      setSuccess("Registration completed. You can log in now.");
      window.setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async (credential) => {
    if (!form.name.trim()) {
      setError("Add your full name before continuing with Google.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const session = await authenticateWithGoogle({
        credential,
        intent: "register",
        name: form.name.trim(),
        role: "student",
        phone: form.phone.trim(),
        referral_code: form.referral_code.trim(),
      });
      navigate(getRoleHomePath(session.user.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-shell auth-login-shell auth-register-shell">
      <div className="auth-login-page auth-register-page" style={{ backgroundImage: `url(${heroLearningImage})` }}>
        <div className="auth-login-backdrop auth-register-backdrop" />
        <section className="auth-login-layout auth-register-layout">
          <div className="auth-login-copy auth-register-copy">
            <div className="auth-brand-lockup auth-brand-lockup-login">
              <img src={quadraviseLogo} alt="Quadravise logo" className="auth-brand-logo" />
              <div>
                <strong>QuadraILearn</strong>
                <small>Learning intelligence platform</small>
              </div>
            </div>
            <h1>Start your QuadraILearn exam journey.</h1>
            <p>
              Create your account to pick an exam, take your first free 30-question mock test, and
              build improvement from every report.
            </p>
            <p>New accounts receive a welcome token bonus, and referrals reward the inviter.</p>
            <div className="auth-login-proof auth-register-proof">
              <div className="auth-login-proof-card">
                <strong>First test free</strong>
                <small>Start without friction</small>
              </div>
              <div className="auth-login-proof-card">
                <strong>Exam + subject flow</strong>
                <small>Practice in the right context</small>
              </div>
              <div className="auth-login-proof-card">
                <strong>Report to retest</strong>
                <small>Learn from weak topics fast</small>
              </div>
            </div>
          </div>

          <div className="auth-login-card auth-register-card panel">
            <div className="auth-login-card-top">
              <h2>Create account</h2>
              <p>Set up your student profile and enter the mock-test platform.</p>
            </div>

            <form className="form-grid auth-form auth-login-form auth-register-form" onSubmit={handleSubmit}>
              <div className="form-row auth-register-row">
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <Input id="name" name="name" size="large" value={form.name} onChange={handleChange} required />
                </div>
                <div className="field">
                  <label htmlFor="phone">Mobile</label>
                  <Input id="phone" name="phone" size="large" value={form.phone} onChange={handleChange} />
                </div>
              </div>
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
                <label htmlFor="password">Password</label>
                <Input.Password
                  id="password"
                  name="password"
                  size="large"
                  minLength="8"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="referral_code">Referral code</label>
                <Input
                  id="referral_code"
                  name="referral_code"
                  size="large"
                  value={form.referral_code}
                  onChange={handleChange}
                  placeholder="Optional referral code"
                />
              </div>

              <FormMessage>{error}</FormMessage>
              <FormMessage type="success">{success}</FormMessage>
              <Button className="button button-primary auth-submit auth-login-submit" htmlType="submit" loading={loading} size="large">
                {loading ? "Creating account..." : "Create account"}
              </Button>
              <div className="auth-divider auth-login-divider">
                <span>or</span>
              </div>
              <GoogleAuthButton buttonText="signup_with" disabled={loading} onCredential={handleGoogleRegister} />
            </form>

            <div className="auth-login-footer">
              <span>Already registered?</span>
              <Link to="/login">Login</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
