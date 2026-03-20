import { Link } from "react-router-dom";

import quadraviseLogo from "../assets/quadravise_logo.png";

function AccountDeletionPage() {
  return (
    <div className="page auth-shell">
      <div className="auth-page reset-auth-page">
        <section className="auth-card reset-auth-card">
          <div className="auth-brand-lockup auth-brand-lockup-light">
            <img src={quadraviseLogo} alt="Quadravise logo" className="auth-brand-logo" />
            <div>
              <strong>QuadraILearn</strong>
              <small>Account deletion</small>
            </div>
          </div>
          <div className="auth-card-head">
            <h2>Account Deletion</h2>
            <p>Last updated: March 20, 2026</p>
          </div>

          <div className="form-grid auth-form">
            <div className="field">
              <label>How to request deletion</label>
              <p>Email support@quadravise.com from your registered email address and include your account role plus whether the request applies to mobile, web, or both.</p>
            </div>
            <div className="field">
              <label>What happens next</label>
              <p>We verify ownership, review linked dependencies such as guardian/admin relationships, and process deletion or anonymization as required by operational and legal constraints.</p>
            </div>
            <div className="field">
              <label>Typical deletion scope</label>
              <p>This may include account profile information, uploaded profile image data, linked app access, and authentication records not required for compliance or abuse prevention.</p>
            </div>
            <div className="field">
              <label>Retention limits</label>
              <p>Certain records may be retained for security, compliance, billing, fraud prevention, or audit obligations.</p>
            </div>
          </div>

          <p className="auth-footer-note">
            Privacy policy: <Link to="/privacy/mobile">Open privacy policy</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default AccountDeletionPage;
