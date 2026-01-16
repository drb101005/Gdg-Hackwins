import React from 'react';

function Analytics() {
  const avgScore = 7.8;
  const totalQuestions = 124;
  const totalSessions = 28;
  const improvementPercent = 23;

  // --- MATH FOR THE RING ---
  // Box is 180x180. Center is 90,90.
  // Radius = 70 (Fits nicely with 12px stroke)
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~440
  // Calculate how much "empty" space should be left
  const strokeDashoffset = circumference - (avgScore / 10) * circumference;

  return (
    <div className="analytics-page">
      <header className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Track your interview performance over time</p>
      </header>

      <div className="analytics-content">
        <div className="analytics-grid">
          
          {/* --- SCORE CARD --- */}
          <div className="analytics-card card-glass score-card">
            <h3>Average Score</h3>
            
            <div className="score-ring large" style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#007BFF" />
                    <stop offset="100%" stopColor="#00FF88" />
                  </linearGradient>
                </defs>

                {/* 1. Background Track (Dark Grey) */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="12"
                />

                {/* 2. Completion Bar (Colored) */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke="url(#ringGradient)" 
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>

              {/* Text Center Overlay */}
              <div className="score-value" style={{ 
                position: 'absolute', 
                top: 0, left: 0, width: '100%', height: '100%', 
                display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center' 
              }}>
                <span className="score-number large" style={{ 
                  fontSize: '3rem', 
                  fontWeight: '800', 
                  background: 'linear-gradient(135deg, #007BFF 0%, #00FF88 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent' 
                }}>
                  {avgScore}
                </span>
                <span className="score-label" style={{ color: '#888', marginTop: '-5px' }}>out of 10</span>
              </div>
            </div>
          </div>

          {/* QUESTIONS CARD */}
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

          {/* SESSIONS CARD */}
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

          {/* IMPROVEMENT CARD */}
          <div className="analytics-card card-glass">
            <h3>Improvement</h3>
            <div className="stat-display">
              <span className="stat-number green">+{improvementPercent}%</span>
              <span className="stat-label-small">vs. last month</span>
            </div>
          </div>
        </div>

        {/* CHART SECTION */}
        <div className="chart-section card-glass">
          <h3>Performance Over Time</h3>
          <div className="chart-placeholder">
            <svg width="100%" height="200" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#007BFF" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#007BFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.1)" strokeDasharray="4" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.1)" strokeDasharray="4" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.1)" strokeDasharray="4" />

              {/* Area */}
              <path
                d="M0,150 L100,120 L200,140 L300,100 L400,80 L500,60 L600,40 L600,200 L0,200 Z"
                fill="url(#chartFill)"
              />

              {/* Line */}
              <path
                d="M0,150 L100,120 L200,140 L300,100 L400,80 L500,60 L600,40"
                fill="none"
                stroke="#007BFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dot */}
              <circle cx="600" cy="40" r="6" fill="#00FF88" stroke="#fff" strokeWidth="2" />
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