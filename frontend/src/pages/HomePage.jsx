import { useEffect } from "react";
import { Link } from "react-router-dom";
import heroLearningImage from "../assets/learning_01.png";
import landingPageBanner from "../assets/landingpagebanner.png";
import quadraviseLogo from "../assets/quadravise_logo.png";

function HomePage() {
  useEffect(() => {
    let favicon = document.querySelector("link[rel='icon']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }

    favicon.setAttribute("href", quadraviseLogo);
    favicon.setAttribute("type", "image/png");
  }, []);

  return (
    <div className="page landing-page-shell">
      <div className="home-page landing-page">
        <header className="landing-header">
          <div className="brand brand-header">
            <span className="brand-mark">
              <img src={quadraviseLogo} alt="Quadravise logo" className="brand-mark-image" />
            </span>
            <span className="brand-copy">
              <strong>QuadraILearn</strong>
              <small>Learning intelligence platform</small>
            </span>
          </div>
          <div className="header-actions">
            <Link className="header-link" to="/login">
              Login
            </Link>
            <Link className="button button-primary header-cta" to="/register">
              Start Free Diagnostic
            </Link>
          </div>
        </header>

        <section
          className="hero-banner"
          id="home"
          style={{ backgroundImage: `url(${heroLearningImage})` }}
        >
          <div className="hero-banner-overlay">
            <div className="hero-banner-content">
              <h1 className="hero-banner-title">
                Improve Your Learning
                <span>For Every Exam That Matters</span>
              </h1>
              <p className="hero-banner-copy">
                QuadraILearn helps students identify weak concepts, track study consistency, and
                improve exam readiness with clear insights.
              </p>
              <div className="hero-actions hero-banner-actions">
                <Link className="button button-primary" to="/register">
                  Start Free Diagnostic
                </Link>
                <Link className="button button-secondary button-secondary-hero" to="/login">
                  Student Login
                </Link>
              </div>
              <p className="hero-exam-line">For students preparing for: CBSE • ICSE • JEE • NEET</p>
            </div>
          </div>
        </section>

        <section className="landing-section full-viewport-section split-viewport-section" id="help">
          <div className="section-head">
            <h2>How QuadraILearn helps students</h2>
          </div>
          <div className="help-grid">
            <article className="panel simple-card">
              <h3>Find weak concepts</h3>
              <p>Understand which topics you are struggling with.</p>
            </article>
            <article className="panel simple-card">
              <h3>Track learning progress</h3>
              <p>See how your understanding improves over time.</p>
            </article>
            <article className="panel simple-card">
              <h3>Focus on the right topics</h3>
              <p>Study what matters most instead of guessing.</p>
            </article>
          </div>
        </section>

        <section
          className="landing-section alt-band family-band full-viewport-section split-viewport-section"
          id="families"
          style={{ backgroundImage: `url(${heroLearningImage})` }}
        >
          <div className="section-head">
            <h2>Helpful for both students and parents</h2>
          </div>
          <div className="family-grid">
            <article className="panel family-card">
              <h3>For Students</h3>
              <ul className="journey-list">
                <li>Identify weak topics</li>
                <li>Improve concept understanding</li>
                <li>Track study consistency</li>
                <li>Prepare better for exams</li>
              </ul>
            </article>
            <article className="panel family-card family-card-accent">
              <h3>For Parents</h3>
              <ul className="journey-list">
                <li>See student progress clearly</li>
                <li>Understand weak areas</li>
                <li>Track learning consistency</li>
                <li>Support study improvement</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="landing-section" id="dashboard">
          <div className="section-head dashboard-section-head">
            <div>
              <h2>A clearer view of student progress</h2>
            </div>
            <p>
              One dashboard for weak concepts, learning health, and consistency signals.
            </p>
          </div>
          <article className="dashboard-unified-card">
            <div className="dashboard-mock-top">
              <div>
                <h3>Your learning dashboard</h3>
              </div>
            </div>
            <div className="dashboard-preview-grid">
              <div className="mock-metric">
                <span>Weak concepts</span>
                <strong>6 topics</strong>
                <small>Algebra, force systems, organic basics</small>
              </div>
              <div className="mock-metric">
                <span>Learning health</span>
                <strong>78%</strong>
                <small>Consistency and topic coverage</small>
              </div>
              <div className="mock-metric mock-wide">
                <span>Progress trends</span>
                <div className="trend-stat-row">
                  <div className="trend-stat">
                    <strong>+12%</strong>
                    <small>Consistency</small>
                  </div>
                  <div className="trend-stat">
                    <strong>+8%</strong>
                    <small>Coverage</small>
                  </div>
                  <div className="trend-stat">
                    <strong>3 weeks</strong>
                    <small>Improving</small>
                  </div>
                </div>
                <small>Track study consistency across sessions</small>
              </div>
            </div>
            <p className="dashboard-unified-copy">
              QuadraILearn brings the most important learning signals into one simple view, so
              students and parents can understand where improvement is needed.
            </p>
            <div className="dashboard-inline-steps">
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">01</span>
                <div>
                  <strong>Weak concepts</strong>
                  <small>See exactly which topics need more attention.</small>
                </div>
              </div>
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">02</span>
                <div>
                  <strong>Learning health</strong>
                  <small>Track the overall strength of current learning habits.</small>
                </div>
              </div>
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">03</span>
                <div>
                  <strong>Progress trends</strong>
                  <small>Understand whether performance is moving up over time.</small>
                </div>
              </div>
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">04</span>
                <div>
                  <strong>Study consistency</strong>
                  <small>Monitor how regularly the student is staying on track.</small>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <div className="process-grid">
            <article className="process-card">
              <span className="process-step-label">01</span>
              <div className="process-icon-tile" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="process-icon">
                  <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M16 16L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Take a diagnostic test</h3>
              <p>Start with a simple diagnostic to identify weak concepts and readiness gaps.</p>
            </article>
            <article className="process-card">
              <span className="process-step-label">02</span>
              <div className="process-icon-tile" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="process-icon">
                  <path d="M4 18H20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M6 16V9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 16V6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M18 16V11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>See learning health</h3>
              <p>Understand concept weakness, consistency, and overall learning health clearly.</p>
            </article>
            <article className="process-card">
              <span className="process-step-label">03</span>
              <div className="process-icon-tile" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="process-icon">
                  <path d="M5 12H19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M13 6L19 12L13 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Follow focused practice</h3>
              <p>Improve study outcomes with clearer next steps instead of random revision.</p>
            </article>
          </div>
        </section>

        <section className="landing-section" id="why">
          <div className="section-head">
            <h2>Why students use QuadraILearn</h2>
          </div>
          <div className="preview-style-grid">
            <article className="preview-style-card">
              <h3>Concept clarity</h3>
              <p>Understand topics deeply, not just memorize answers.</p>
              <div className="preview-style-tags">
                <span className="tag">Weak areas</span>
                <span className="tag">Topic view</span>
                <span className="tag">Understanding</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-blue">
                <span>Outcome</span>
                <strong>Better concept understanding</strong>
              </div>
            </article>
            <article className="preview-style-card">
              <h3>Progress tracking</h3>
              <p>Track learning improvement week by week.</p>
              <div className="preview-style-tags">
                <span className="tag">Weekly trends</span>
                <span className="tag">Signals</span>
                <span className="tag">Consistency</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-orange">
                <span>Outcome</span>
                <strong>Visible learning movement</strong>
              </div>
            </article>
            <article className="preview-style-card">
              <h3>Parent visibility</h3>
              <p>Parents can monitor student progress easily.</p>
              <div className="preview-style-tags">
                <span className="tag">Guardian view</span>
                <span className="tag">Progress</span>
                <span className="tag">Support</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-green">
                <span>Outcome</span>
                <strong>Clearer parent visibility</strong>
              </div>
            </article>
            <article className="preview-style-card">
              <h3>Exam readiness</h3>
              <p>Improve preparation for school and competitive exams.</p>
              <div className="preview-style-tags">
                <span className="tag">CBSE</span>
                <span className="tag">JEE</span>
                <span className="tag">NEET</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-purple">
                <span>Outcome</span>
                <strong>Stronger exam preparation</strong>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section">
          <div
            className="panel final-cta simple-final-cta final-cta-banner"
            style={{ backgroundImage: `url(${landingPageBanner})` }}
          >
            <div>
              <h2>Start improving your learning today</h2>
              <p>
                Run a quick diagnostic and see where your learning needs improvement.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" to="/register">
                Start Free Diagnostic
              </Link>
            </div>
          </div>
        </section>

        <footer className="landing-footer simple-footer">
          <div>
            <div className="brand">
              <span className="brand-mark">
                <img src={quadraviseLogo} alt="Quadravise logo" className="brand-mark-image" />
              </span>
              <span>QuadraILearn</span>
            </div>
            <p className="footer-note">A product by Quadravise</p>
            <p>
              Modern software designed to help students understand and improve learning health.
            </p>
          </div>
          <div>
            <h4>Links</h4>
            <div className="footer-column-links">
              <Link to="/login">Student Login</Link>
              <Link to="/login">Parent Login</Link>
              <a href="#">Privacy Policy</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default HomePage;
