import { useState } from "react";
import { Link } from "react-router-dom";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import quadraviseLogo from "../assets/quadravise_logo.png";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSuccess(response.message);
      setEmail("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-shell">
      <div className="auth-page reset-auth-page">
        <section className="auth-card reset-auth-card">
          <div className="auth-brand-lockup auth-brand-lockup-light">
            <img src={quadraviseLogo} alt="Quadravise logo" className="auth-brand-logo" />
            <div>
              <strong>QuadraILearn</strong>
              <small>Forgot password</small>
            </div>
          </div>
          <div className="auth-card-head">
            <h2>Reset your password</h2>
            <p>Enter your email and we will send a password reset link.</p>
          </div>
          <form className="form-grid auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <FormMessage>{error}</FormMessage>
            <FormMessage type="success">{success}</FormMessage>
            <button className="button button-primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset email"}
            </button>
          </form>
          <p className="auth-footer-note">
            Back to <Link to="/login">Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
