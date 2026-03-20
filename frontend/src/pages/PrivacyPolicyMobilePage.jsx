import { Link } from "react-router-dom";

import quadraviseLogo from "../assets/quadravise_logo.png";

function PrivacyPolicyMobilePage() {
  return (
    <div className="page auth-shell">
      <div className="auth-page reset-auth-page">
        <section className="auth-card reset-auth-card">
          <div className="auth-brand-lockup auth-brand-lockup-light">
            <img src={quadraviseLogo} alt="Quadravise logo" className="auth-brand-logo" />
            <div>
              <strong>QuadraILearn</strong>
              <small>Mobile privacy policy</small>
            </div>
          </div>
          <div className="auth-card-head">
            <h2>Privacy Policy</h2>
            <p>Last updated: March 20, 2026</p>
          </div>

          <div className="form-grid auth-form">
            <div className="field">
              <label>Overview</label>
              <p>QuadraILearn collects and processes account, learning, and device-related information required to operate the mobile app and connected web platform.</p>
            </div>
            <div className="field">
              <label>Data We Collect</label>
              <p>Account details, authentication data, student profile information, diagnostic/report activity, token and referral activity, and role-based management data.</p>
            </div>
            <div className="field">
              <label>How We Use Data</label>
              <p>We use data to create accounts, authenticate users, generate reports and learning guidance, support guardian/admin workflows, and send verification and password reset emails.</p>
            </div>
            <div className="field">
              <label>Data Sharing</label>
              <p>We do not sell personal information. Data may be processed by service providers needed for hosting, authentication, storage, email delivery, analytics, or support operations.</p>
            </div>
            <div className="field">
              <label>Security</label>
              <p>We apply reasonable safeguards. On supported native devices, mobile session data is stored using secure device storage.</p>
            </div>
            <div className="field">
              <label>User Rights</label>
              <p>Users may request account access, correction, or deletion by contacting support.</p>
            </div>
            <div className="field">
              <label>Contact</label>
              <p>support@quadravise.com</p>
            </div>
          </div>

          <p className="auth-footer-note">
            Account deletion: <Link to="/account-deletion">Open deletion policy</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicyMobilePage;
