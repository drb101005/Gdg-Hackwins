import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

function Landing() {
  const [activePreview, setActivePreview] = useState("resume");
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-modern">
      
      {/* Scroll Progress */}
      <div
        className="scroll-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* NAV */}
      <nav className="landing-nav-modern">
        <Link to="/" className="logo-modern">
          InterviewLab
        </Link>

        <div className="nav-links-modern">
  <ThemeToggle />
          <Link to="/login" className="nav-link-modern">
            Login
          </Link>
          <Link to="/signup" className="btn-primary-modern">
            Create Account
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-modern">
        <div className="hero-text">
          <h1>
            Practice interviews <br />
            like they’re real.
          </h1>
          <p>
            Structured practice sessions. Timed responses. 
            Honest feedback. No scripts. No shortcuts.
          </p>

          <div className="hero-actions-modern">
            <Link to="/signup" className="btn-primary-modern">
              Start Practicing
            </Link>
            <Link to="/login" className="btn-secondary-modern">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PREVIEW */}
      <section className="preview-section">
        <h2>How it works</h2>

        <div className="preview-toggle">
          <button
            className={activePreview === "resume" ? "active" : ""}
            onClick={() => setActivePreview("resume")}
          >
            Resume Mode
          </button>
          <button
            className={activePreview === "job" ? "active" : ""}
            onClick={() => setActivePreview("job")}
          >
            Job Description Mode
          </button>
        </div>

        <div className="preview-card">
          {activePreview === "resume" ? (
            <>
              <h3>Upload Resume</h3>
              <p>
                The system extracts keywords and generates targeted 
                technical + behavioral questions based on your profile.
              </p>
              <ul>
                <li>Role-specific questions</li>
                <li>Strength/weakness detection</li>
                <li>Clarity scoring</li>
              </ul>
            </>
          ) : (
            <>
              <h3>Paste Job Description</h3>
              <p>
                Practice for a specific company or role with questions
                tailored to real expectations.
              </p>
              <ul>
                <li> Company-aligned questioning</li>
                <li> Pressure simulation</li>
                <li> Structured feedback</li>
              </ul>
            </>
          )}
        </div>
      </section>

      {/* WHAT THIS IS */}
      <section className="philosophy-section">
        <div className="philosophy-grid">
          <div>
            <h3>This is</h3>
            <ul>
              <li>✓ A structured thinking trainer</li>
              <li>✓ A pressure simulator</li>
              <li>✓ A feedback engine</li>
            </ul>
          </div>

          <div>
            <h3>This is not</h3>
            <ul>
              <li>✕ A script generator</li>
              <li>✕ A memorization shortcut</li>
              <li>✕ A cheat sheet</li>
            </ul>
          </div>
        </div>
      </section>

      {/* BUILDER NOTE */}
      <section className="builder-note">
        <h2>Why this exists</h2>
        <p>
          Most interview prep tools help you memorize answers.
          Real interviews test how you think under pressure.
        </p>
        <p>
          This was built to simulate that pressure — 
          so you improve before it actually matters.
        </p>
      </section>

      {/* CTA */}
      <section className="final-cta">
        <h2>Your next interview won’t wait.</h2>
        <Link to="/signup" className="btn-primary-modern">
          Start Your First Session
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="footer-modern">
        <p>
          Built with React • Web Speech API • Gemini
        </p>
      </footer>
    </div>
  );
}

export default Landing;
