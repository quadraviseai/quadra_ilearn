import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import quadraviseLogo from "../assets/quadravise_logo.png";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const linkReady = useMemo(() => Boolean(uid && token), [uid, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: { uid, token, password },
      });
      setSuccess(response.message);
      setPassword("");
      setConfirmPassword("");
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
              <small>Reset password</small>
            </div>
          </div>
          <div className="auth-card-head">
            <h2>Set a new password</h2>
            <p>Create a new password for your account and return to login.</p>
          </div>
          {!linkReady ? <FormMessage>Invalid or missing reset link.</FormMessage> : null}
          <form className="form-grid auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                minLength="8"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!linkReady}
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                minLength="8"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={!linkReady}
              />
            </div>
            <FormMessage>{error}</FormMessage>
            <FormMessage type="success">{success}</FormMessage>
            <button className="button button-primary auth-submit" type="submit" disabled={loading || !linkReady}>
              {loading ? "Updating..." : "Update password"}
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

export default ResetPasswordPage;
