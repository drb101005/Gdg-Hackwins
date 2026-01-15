import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          Ace.ai
        </Link>
        <div className="nav-links">
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/signup" className="btn btn-primary">Sign Up</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          AI-Powered Practice Platform
        </div>

        <div className="hero-content">
          <h1 className="title-hero">Ace.ai</h1>
          <p className="subtitle">Your AI Viva & Interview Coach</p>
          <p className="tagline">Practice speaking. Get scored. Improve faster.</p>
        </div>

        <div className="hero-features">
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </div>
            <h3>Voice Recognition</h3>
            <p>Speak naturally, get instant transcription</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <h3>Real-time Feedback</h3>
            <p>Get scored instantly after each answer</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h3>Track Progress</h3>
            <p>See your improvement over time</p>
          </div>
        </div>

        <div className="hero-actions">
          <Link to="/signup" className="btn btn-glow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Get Started Free
          </Link>
          <Link to="/login" className="btn btn-secondary">
            I have an account
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Landing;
