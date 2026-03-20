import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import quadraviseLogo from "../assets/quadravise_logo.png";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const linkReady = useMemo(() => Boolean(uid && token), [uid, token]);

  useEffect(() => {
    const verify = async () => {
      if (!linkReady) {
        setError("Invalid or missing verification link.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest("/api/auth/verify-email", {
          method: "POST",
          body: { uid, token },
        });
        setSuccess(response.message);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [linkReady, token, uid]);

  return (
    <div className="page auth-shell">
      <div className="auth-page reset-auth-page">
        <section className="auth-card reset-auth-card">
          <div className="auth-brand-lockup auth-brand-lockup-light">
            <img src={quadraviseLogo} alt="Quadravise logo" className="auth-brand-logo" />
            <div>
              <strong>QuadraILearn</strong>
              <small>Email verification</small>
            </div>
          </div>
          <div className="auth-card-head">
            <h2>Verify your email</h2>
            <p>We are confirming your registration link now.</p>
          </div>
          {loading ? <p className="auth-footer-note">Verifying...</p> : null}
          <FormMessage>{error}</FormMessage>
          <FormMessage type="success">{success}</FormMessage>
          <p className="auth-footer-note">
            Continue to <Link to="/login">Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
