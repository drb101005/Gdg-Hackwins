import React from 'react';
import { Link } from 'react-router-dom';

const mockSessions = [
  {
    id: 1,
    topic: "JavaScript Fundamentals",
    date: "Jan 12, 2026",
    score: 8.5,
    questions: 5
  },
  {
    id: 2,
    topic: "React Hooks & State Management",
    date: "Jan 11, 2026",
    score: 7.2,
    questions: 4
  },
  {
    id: 3,
    topic: "System Design Interview",
    date: "Jan 10, 2026",
    score: 6.8,
    questions: 5
  },
  {
    id: 4,
    topic: "Data Structures & Algorithms",
    date: "Jan 9, 2026",
    score: 9.1,
    questions: 6
  },
  {
    id: 5,
    topic: "Behavioral Interview Practice",
    date: "Jan 8, 2026",
    score: 8.0,
    questions: 4
  }
];

function Dashboard() {
  const getScoreClass = (score) => {
    if (score >= 8) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  };

  const avgScore = (mockSessions.reduce((acc, s) => acc + s.score, 0) / mockSessions.length).toFixed(1);
  const totalSessions = mockSessions.length;
  const totalQuestions = mockSessions.reduce((acc, s) => acc + s.questions, 0);

  return (
    <div className="dashboard">
      <nav className="landing-nav" style={{ marginBottom: 'var(--spacing-lg)', padding: 0 }}>
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
        <Link to="/" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          New Session
        </Link>
      </nav>

      <header className="dashboard-header">
        <h1 className="dashboard-title">Your Progress</h1>
        <p className="dashboard-subtitle">Track your interview practice performance</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value blue">{totalSessions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Score</div>
          <div className="stat-value green">{avgScore}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Questions Answered</div>
          <div className="stat-value blue">{totalQuestions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week</div>
          <div className="stat-value green">+3</div>
        </div>
      </div>

      <section className="sessions-section">
        <h3>Recent Sessions</h3>
        <div className="sessions-list">
          {mockSessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-info">
                <span className="session-topic">{session.topic}</span>
                <span className="session-date">
                  {session.date} • {session.questions} questions
                </span>
              </div>
              <div className={`session-score ${getScoreClass(session.score)}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                {session.score}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;