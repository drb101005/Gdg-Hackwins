import React, { useEffect, useState } from "react";

function Analytics() {

  const avgScore = 7.8;
  const totalQuestions = 124;
  const totalSessions = 28;
  const improvementPercent = 23;

  const [animatedScore, setAnimatedScore] = useState(0);

  /* ---------- ANIMATE SCORE RING ---------- */

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 0.1;
      setAnimatedScore(Math.min(avgScore, i));
      if (i >= avgScore) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, []);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (animatedScore / 10) * circumference;

  return (
    <div className="analytics-modern">

      {/* HEADER */}
      <div className="analytics-header-modern">
        <h1>Performance Overview</h1>
        <p>
          Analyze how you’re improving across sessions.
        </p>
      </div>

      {/* TOP GRID */}
      <div className="analytics-grid-modern">

        {/* SCORE RING */}
        <div className="analytics-card-modern ring-card">
          <h3>Average Score</h3>

          <div className="ring-wrapper-modern">
            <svg width="180" height="180">
              <circle
                cx="90"
                cy="90"
                r={radius}
                stroke="#e5e7eb"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="90"
                cy="90"
                r={radius}
                stroke="var(--accent)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.4s ease" }}
                transform="rotate(-90 90 90)"
              />
            </svg>

            <div className="ring-value-modern">
              {animatedScore.toFixed(1)}
              <span>/10</span>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="analytics-card-modern">
          <h4>Total Sessions</h4>
          <div className="stat-big-modern">
            {totalSessions}
          </div>
        </div>

        <div className="analytics-card-modern">
          <h4>Questions Answered</h4>
          <div className="stat-big-modern">
            {totalQuestions}
          </div>
        </div>

        <div className="analytics-card-modern">
          <h4>Improvement</h4>
          <div className="stat-big-modern accent">
            +{improvementPercent}%
          </div>
        </div>

      </div>

      {/* PERFORMANCE TREND */}
      <div className="analytics-card-modern chart-card">
        <h3>Performance Trend</h3>

        <div className="chart-modern">

          <div className="chart-line-modern" />

          <div className="chart-labels-modern">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
            <span>Now</span>
          </div>

        </div>
      </div>

      {/* INSIGHT */}
      <div className="analytics-insight-modern">
        <h3>Insight</h3>
        <p>
          Your scores show steady improvement. Continue
          focusing on structured explanations and reducing
          filler words to push beyond 8.5 consistently.
        </p>
      </div>

    </div>
  );
}

export default Analytics;
