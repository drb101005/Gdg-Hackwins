import React, { useEffect, useState } from "react";
import { getAnalyticsSummary } from "../services/api";

function Analytics() {
  const [summary, setSummary] = useState({
    averageScore: 0,
    totalQuestions: 0,
    totalSessions: 0,
    improvementPercent: 0,
    trend: [],
  });
  const [error, setError] = useState("");
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    getAnalyticsSummary()
      .then((response) => setSummary(response))
      .catch((err) => setError(err.message || "Unable to load analytics."));
  }, []);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 0.1;
      setAnimatedScore(Math.min(summary.averageScore, i));
      if (i >= summary.averageScore) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [summary.averageScore]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 10) * circumference;
  const trendLabels = summary.trend.length ? summary.trend : [{ label: "Start" }, { label: "Now" }];

  return (
    <div className="analytics-modern">
      <div className="analytics-header-modern">
        <h1>Performance Overview</h1>
        <p>Analyze how you are improving across sessions.</p>
      </div>

      <div className="analytics-grid-modern">
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

        <div className="analytics-card-modern">
          <h4>Total Sessions</h4>
          <div className="stat-big-modern">{summary.totalSessions}</div>
        </div>

        <div className="analytics-card-modern">
          <h4>Questions Answered</h4>
          <div className="stat-big-modern">{summary.totalQuestions}</div>
        </div>

        <div className="analytics-card-modern">
          <h4>Improvement</h4>
          <div className="stat-big-modern accent">
            +{summary.improvementPercent.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="analytics-card-modern chart-card">
        <h3>Performance Trend</h3>

        <div className="chart-modern">
          <div className="chart-line-modern" />

          <div className="chart-labels-modern">
            {trendLabels.map((item) => (
              <span key={item.label}>{item.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="analytics-insight-modern">
        <h3>Insight</h3>
        <p>
          {summary.totalSessions
            ? "Your average score is improving as you complete more local interview sessions. Keep answers specific and outcome-focused."
            : "Finish an interview to start building your trend line."}
        </p>
      </div>

      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

export default Analytics;
