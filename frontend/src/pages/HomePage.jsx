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
              Start Free Test
            </Link>
          </div>
        </header>

        <section className="hero-banner" style={{ backgroundImage: `url(${heroLearningImage})` }}>
          <div className="hero-banner-overlay">
            <div className="hero-banner-content">
              <h1 className="hero-banner-title">
                Practice The Right Test
                <span>Then Fix What Went Wrong</span>
              </h1>
              <p className="hero-banner-copy">
                QuadraILearn is now focused on a direct student flow: register, select exam and
                subject, take a 30-question mock test, review weak topics, learn, and retest.
              </p>
              <div className="hero-actions hero-banner-actions">
                <Link className="button button-primary" to="/register">
                  Start Free Test
                </Link>
                <Link className="button button-secondary button-secondary-hero" to="/login">
                  Student Login
                </Link>
              </div>
              <p className="hero-exam-line">For students preparing for: CBSE • JEE • NEET</p>
            </div>
          </div>
        </section>

        <section className="landing-section full-viewport-section split-viewport-section">
          <div className="section-head">
            <h2>How the new student flow works</h2>
          </div>
          <div className="help-grid">
            <article className="panel simple-card">
              <h3>Select exam and subject</h3>
              <p>Start from the exact exam and subject you want to practice.</p>
            </article>
            <article className="panel simple-card">
              <h3>Take a 30-question mock test</h3>
              <p>Answer randomized questions with progress saved instantly.</p>
            </article>
            <article className="panel simple-card">
              <h3>Learn from weak topics</h3>
              <p>Review ranked weak areas, then retest with free or paid access.</p>
            </article>
          </div>
        </section>

        <section
          className="landing-section alt-band family-band full-viewport-section split-viewport-section"
          style={{ backgroundImage: `url(${heroLearningImage})` }}
        >
          <div className="section-head">
            <h2>Built around the full mock-test loop</h2>
          </div>
          <div className="family-grid">
            <article className="panel family-card">
              <h3>Before the test</h3>
              <ul className="journey-list">
                <li>Create your student account</li>
                <li>Log in securely</li>
                <li>Select exam</li>
                <li>Select subject</li>
              </ul>
            </article>
            <article className="panel family-card family-card-accent">
              <h3>After the test</h3>
              <ul className="journey-list">
                <li>Open the report</li>
                <li>Review weak topics</li>
                <li>Learn topic-specific guidance</li>
                <li>Retest with free or paid access</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="landing-section">
          <div className="section-head dashboard-section-head">
            <div>
              <h2>A clearer view of every attempt</h2>
            </div>
            <p>One flow for eligibility, attempt, report, weak-topic learning, and retest.</p>
          </div>
          <article className="dashboard-unified-card">
            <div className="dashboard-mock-top">
              <div>
                <h3>Your mock-test dashboard</h3>
              </div>
            </div>
            <div className="dashboard-preview-grid">
              <div className="mock-metric">
                <span>Eligibility</span>
                <strong>Free first test</strong>
                <small>Then Rs. 10 to unlock the next retest</small>
              </div>
              <div className="mock-metric">
                <span>Report</span>
                <strong>Correct / Wrong / Unanswered</strong>
                <small>See score, percentage, and ranked weak topics</small>
              </div>
              <div className="mock-metric mock-wide">
                <span>Learning flow</span>
                <div className="trend-stat-row">
                  <div className="trend-stat">
                    <strong>01</strong>
                    <small>Take test</small>
                  </div>
                  <div className="trend-stat">
                    <strong>02</strong>
                    <small>See report</small>
                  </div>
                  <div className="trend-stat">
                    <strong>03</strong>
                    <small>Learn and retest</small>
                  </div>
                </div>
                <small>Move from attempt to improvement without leaving the app flow</small>
              </div>
            </div>
            <p className="dashboard-unified-copy">
              QuadraILearn now centers the student experience around one practical cycle: test,
              report, weak-topic learning, and retest.
            </p>
            <div className="dashboard-inline-steps">
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">01</span>
                <div>
                  <strong>Exam and subject</strong>
                  <small>Start from the exact practice context you need.</small>
                </div>
              </div>
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">02</span>
                <div>
                  <strong>Mock test engine</strong>
                  <small>Take a 30-question test with instant local save.</small>
                </div>
              </div>
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">03</span>
                <div>
                  <strong>Performance report</strong>
                  <small>Measure score, percentage, and weak-topic rank.</small>
                </div>
              </div>
              <div className="dashboard-inline-step">
                <span className="preview-feature-icon">04</span>
                <div>
                  <strong>Learn and retest</strong>
                  <small>Study what failed, then unlock the next test.</small>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="landing-section">
          <div className="section-head">
            <h2>Why students use QuadraILearn</h2>
          </div>
          <div className="preview-style-grid">
            <article className="preview-style-card">
              <h3>Exam-specific practice</h3>
              <p>Stay inside the exam and subject you actually want to prepare for.</p>
              <div className="preview-style-tags">
                <span className="tag">Exam choice</span>
                <span className="tag">Subject mapping</span>
                <span className="tag">Start gate</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-blue">
                <span>Outcome</span>
                <strong>Cleaner start to every practice session</strong>
              </div>
            </article>
            <article className="preview-style-card">
              <h3>Clear reporting</h3>
              <p>See total, correct, wrong, unanswered, score, and percentage.</p>
              <div className="preview-style-tags">
                <span className="tag">Score</span>
                <span className="tag">Percentage</span>
                <span className="tag">Weak topics</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-orange">
                <span>Outcome</span>
                <strong>Faster understanding of performance gaps</strong>
              </div>
            </article>
            <article className="preview-style-card">
              <h3>Focused learning</h3>
              <p>Study weak topics with direct guidance instead of random revision.</p>
              <div className="preview-style-tags">
                <span className="tag">Topic rank</span>
                <span className="tag">Learn</span>
                <span className="tag">Retry</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-green">
                <span>Outcome</span>
                <strong>More useful revision after every attempt</strong>
              </div>
            </article>
            <article className="preview-style-card">
              <h3>Retest access</h3>
              <p>First attempt is free. The next one unlocks through a simple payment step.</p>
              <div className="preview-style-tags">
                <span className="tag">Free attempt</span>
                <span className="tag">Rs. 10</span>
                <span className="tag">Entitlement</span>
              </div>
              <div className="preview-style-outcome preview-style-outcome-purple">
                <span>Outcome</span>
                <strong>Simple retest progression</strong>
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section">
          <div className="panel final-cta simple-final-cta final-cta-banner" style={{ backgroundImage: `url(${landingPageBanner})` }}>
            <div>
              <h2>Start the new mock-test journey today</h2>
              <p>
                Create a student account, take the first free test, and use the report to improve
                the next attempt.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" to="/register">
                Start Free Test
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
            <p>Modern software designed to help students test, learn from mistakes, and retest.</p>
          </div>
          <div>
            <h4>Links</h4>
            <div className="footer-column-links">
              <Link to="/login">Student Login</Link>
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
