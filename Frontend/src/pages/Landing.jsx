import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { ArrowRight, Briefcase, CheckCircle, Cpu, FileText, ShieldCheck, XCircle, Zap } from "lucide-react";

function Landing() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-modern">
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      <nav className="landing-nav-modern">
        <Link to="/" className="logo-modern">
          SkillBarter
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

      <section className="hero-modern">
        <div className="hero-text">
          <h1>
            Practice interviews <br />
            like they're real.
          </h1>
          <p>
            Structured practice sessions. Timed responses. Honest feedback. No scripts. No shortcuts. Prepare for
            the pressure, not just the questions.
          </p>

          <div className="hero-actions-modern">
            <Link to="/signup" className="btn-primary-modern">
              Start Practicing <ArrowRight size={18} style={{ marginLeft: "8px" }} />
            </Link>
            <Link to="/login" className="btn-secondary-modern">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="hero-image-container">
          <div className="hero-image-placeholder">
            <div style={{ textAlign: "center" }}>
              <Cpu size={64} style={{ marginBottom: "1rem", opacity: 0.8 }} />
              <div>Local AI Interview Simulation</div>
            </div>
          </div>
        </div>
      </section>

      <section className="preview-section">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2>How it works</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "auto" }}>
            Start a local session, answer timed questions, and review results generated from on-device storage and
            local services.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FileText size={24} />
            </div>
            <h3>Local Interview Setup</h3>
            <p>Use your resume and job description to generate a stored question set with no external database.</p>
            <div className="more-info">
              <strong>Includes:</strong> SQLite-backed interviews, tailored prompts, and resume-based follow-ups.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Briefcase size={24} />
            </div>
            <h3>Timed Session Flow</h3>
            <p>Each answer is recorded in the browser, uploaded with multipart HTTP, and saved to local storage.</p>
            <div className="more-info">
              <strong>Includes:</strong> 30-second rounds, automatic recording, and resumable interview sessions.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} />
            </div>
            <h3>Instant Mock Analysis</h3>
            <p>The FastAPI service returns mock transcripts and metrics so the demo stays fully local and fast.</p>
            <div className="more-info">
              <strong>Includes:</strong> Transcript preview, WPM tracking, filler counts, and scored feedback.
            </div>
          </div>
        </div>
      </section>

      <section className="philosophy-section">
        <div className="philosophy-grid">
          <div>
            <h3>What This Is</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <CheckCircle size={20} color="var(--accent)" />
                A structured thinking trainer
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <CheckCircle size={20} color="var(--accent)" />
                A pressure simulator
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <CheckCircle size={20} color="var(--accent)" />
                A local feedback engine
              </li>
            </ul>
          </div>

          <div>
            <h3>What This Is Not</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <XCircle size={20} color="var(--text-muted)" />
                A script generator
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <XCircle size={20} color="var(--text-muted)" />
                A memorization shortcut
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <XCircle size={20} color="var(--text-muted)" />
                A cloud-only demo
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="builder-note">
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <ShieldCheck size={32} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div>
            <h2>Why this exists</h2>
            <p>Most interview prep tools help you memorize answers. Real interviews test how you think under pressure.</p>
            <p>This version keeps the entire workflow local so it stays demo-ready, hackathon-friendly, and easy to run offline.</p>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <h2>Your next interview won't wait.</h2>
        <Link to="/signup" className="btn-primary-modern">
          Start Your First Session
        </Link>
      </section>

      <footer className="footer-modern">
        <p>Built for local demos with React, NestJS, SQLite, FastAPI, and local media storage</p>
      </footer>
    </div>
  );
}

export default Landing;
