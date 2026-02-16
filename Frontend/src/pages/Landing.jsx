import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import {
  Briefcase,
  FileText,
  CheckCircle,
  XCircle,
  ArrowRight,
  Cpu,
  ShieldCheck,
  Zap
} from "lucide-react";

function Landing() {
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
            Prepare for the pressure, not just the questions.
          </p>

          <div className="hero-actions-modern">
            <Link to="/signup" className="btn-primary-modern">
              Start Practicing <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </Link>
            <Link to="/login" className="btn-secondary-modern">
              I already have an account
            </Link>
          </div>
        </div>

        {/* HERO VISUAL (Placeholder due to generation limit, but styled) */}
        <div className="hero-image-container">
          <div className="hero-image-placeholder">
            <div style={{ textAlign: 'center' }}>
              <Cpu size={64} style={{ marginBottom: '1rem', opacity: 0.8 }} />
              <div>AI-Powered Simulation</div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PREVIEW / FEATURES */}
      <section className="preview-section">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2>How it works</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "auto" }}>
            Choose your mode and start practicing immediately.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FileText size={24} />
            </div>
            <h3>Resume Mode</h3>
            <p>
              The system extracts keywords and generates targeted
              technical + behavioral questions based on your profile.
            </p>
            <div className="more-info">
              <strong>Includes:</strong> Role-specific questions, strength/weakness detection, and clarity scoring.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Briefcase size={24} />
            </div>
            <h3>Job Description Mode</h3>
            <p>
              Practice for a specific company or role with questions
              tailored to real expectations.
            </p>
            <div className="more-info">
              <strong>Includes:</strong> Company-aligned questioning, pressure simulation, and structured feedback.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} />
            </div>
            <h3>Instant Feedback</h3>
            <p>
              Get immediate insights on your pacing, tone, and content
              quality after every session.
            </p>
            <div className="more-info">
              <strong>Includes:</strong> Speech analysis, filler word counting, and sentiment tracking.
            </div>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="philosophy-section">
        <div className="philosophy-grid">
          <div>
            <h3>What This Is</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <CheckCircle size={20} color="var(--accent)" />
                A structured thinking trainer
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <CheckCircle size={20} color="var(--accent)" />
                A pressure simulator
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <CheckCircle size={20} color="var(--accent)" />
                A feedback engine
              </li>
            </ul>
          </div>

          <div>
            <h3>What This Is Not</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <XCircle size={20} color="var(--text-muted)" />
                A script generator
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <XCircle size={20} color="var(--text-muted)" />
                A memorization shortcut
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <XCircle size={20} color="var(--text-muted)" />
                A cheat sheet
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* BUILDER NOTE */}
      <section className="builder-note">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <ShieldCheck size={32} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div>
            <h2>Why this exists</h2>
            <p>
              Most interview prep tools help you memorize answers.
              Real interviews test how you think under pressure.
            </p>
            <p>
              This was built to simulate that pressure —
              so you improve before it actually matters.
            </p>
          </div>
        </div>
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
