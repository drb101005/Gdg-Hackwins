import React from 'react';

function Analytics() {
  const avgScore = 7.8;
  const totalQuestions = 124;
  const totalSessions = 28;
  const improvementPercent = 23;

  // Calculate stroke offset for score ring
  const circumference = 377;
  const offset = circumference - (avgScore / 10) * circumference;

  return (
    <div className="analytics-page">
      <header className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Track your interview performance over time</p>
      </header>

      <div className="analytics-content">
        <div className="analytics-grid">
          <div className="analytics-card card-glass score-card">
            <h3>Average Score</h3>
            <div className="score-ring large">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="analyticsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent-blue)" />
                    <stop offset="100%" stopColor="var(--accent-green)" />
                  </linearGradient>
                </defs>
                <circle
                  className="score-ring-bg"
                  cx="90"
                  cy="90"
                  r="75"
                  fill="none"
                  stroke="var(--bg-secondary)"
                  strokeWidth="10"
                />
                <circle
                  className="score-ring-progress"
                  cx="90"
                  cy="90"
                  r="75"
                  fill="none"
                  stroke="url(#analyticsGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="471"
                  strokeDashoffset={471 - (avgScore / 10) * 471}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              </svg>
              <div className="score-value">
                <span className="score-number large">{avgScore}</span>
                <span className="score-label">out of 10</span>
              </div>
            </div>
          </div>

          <div className="analytics-card card-glass">
            <h3>Questions Answered</h3>
            <div className="stat-display">
              <span className="stat-number">{totalQuestions}</span>
              <span className="stat-trend positive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                  <polyline points="17,6 23,6 23,12"/>
                </svg>
                +12 this week
              </span>
            </div>
          </div>

          <div className="analytics-card card-glass">
            <h3>Total Sessions</h3>
            <div className="stat-display">
              <span className="stat-number">{totalSessions}</span>
              <span className="stat-trend positive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                  <polyline points="17,6 23,6 23,12"/>
                </svg>
                +5 this week
              </span>
            </div>
          </div>

          <div className="analytics-card card-glass">
            <h3>Improvement</h3>
            <div className="stat-display">
              <span className="stat-number green">+{improvementPercent}%</span>
              <span className="stat-label-small">vs. last month</span>
            </div>
          </div>
        </div>

        <div className="chart-section card-glass">
          <h3>Performance Over Time</h3>
          <div className="chart-placeholder">
            <svg width="100%" height="200" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="50" x2="600" y2="50" stroke="var(--border-color)" strokeDasharray="4" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="var(--border-color)" strokeDasharray="4" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="var(--border-color)" strokeDasharray="4" />

              {/* Area fill */}
              <path
                d="M0,150 L100,120 L200,140 L300,100 L400,80 L500,60 L600,40 L600,200 L0,200 Z"
                fill="url(#chartGradient)"
              />

              {/* Line */}
              <path
                d="M0,150 L100,120 L200,140 L300,100 L400,80 L500,60 L600,40"
                fill="none"
                stroke="var(--accent-blue)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              <circle cx="0" cy="150" r="5" fill="var(--accent-blue)" />
              <circle cx="100" cy="120" r="5" fill="var(--accent-blue)" />
              <circle cx="200" cy="140" r="5" fill="var(--accent-blue)" />
              <circle cx="300" cy="100" r="5" fill="var(--accent-blue)" />
              <circle cx="400" cy="80" r="5" fill="var(--accent-blue)" />
              <circle cx="500" cy="60" r="5" fill="var(--accent-blue)" />
              <circle cx="600" cy="40" r="6" fill="var(--accent-green)" stroke="var(--bg-primary)" strokeWidth="2" />
            </svg>
            <div className="chart-labels">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
              <span>Week 5</span>
              <span>Week 6</span>
              <span>Now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
