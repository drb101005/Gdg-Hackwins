import React, { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../services/api";

function Dashboard() {
  const [summary, setSummary] = useState({
    averageScore: 0,
    totalSessions: 0,
    totalQuestions: 0,
    interviews: [],
    insight: "",
  });
  const [error, setError] = useState("");
  const [avgScore, setAvgScore] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    getDashboardSummary()
      .then((response) => {
        setSummary(response);
      })
      .catch((err) => {
        setError(err.message || "Unable to load dashboard.");
      });
  }, []);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setAvgScore((summary.averageScore * i) / 30);
      setSessionCount(Math.min(summary.totalSessions, i));
      setQuestionCount(Math.min(summary.totalQuestions, i * 3));

      if (i >= 30) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [summary.averageScore, summary.totalQuestions, summary.totalSessions]);

  const getScoreLabel = (score) => {
    if (score >= 8.5) return "Excellent";
    if (score >= 7) return "Good";
    return "Needs Improvement";
  };

  return (
    <div className="dashboard-modern">
      <div className="dashboard-header-modern">
        <div>
          <span className="section-badge-modern">Insights</span>
          <h1>Your Progress</h1>
          <p>Track improvement over time and identify weak spots.</p>
        </div>

        <Link to="/home" className="btn-primary-modern">
          New Session
        </Link>
      </div>

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <h4>Average Score</h4>
          <div className="stat-value-modern">{avgScore.toFixed(1)}</div>
          <span className="stat-label-modern">{getScoreLabel(summary.averageScore)}</span>
        </div>

        <div className="stat-card-modern">
          <h4>Total Sessions</h4>
          <div className="stat-value-modern">{sessionCount}</div>
        </div>

        <div className="stat-card-modern">
          <h4>Questions Answered</h4>
          <div className="stat-value-modern">{questionCount}</div>
        </div>
      </div>

      <div className="insight-card-modern">
        <h3>Performance Insight</h3>
        <p>{summary.insight || "Complete an interview to unlock tailored insights."}</p>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="sessions-modern">
        <div className="sessions-header-modern">
          <div>
            <h3>Recent Sessions</h3>
            <p className="hint-modern">Open a completed summary or jump back into an in-progress round.</p>
          </div>
        </div>

        {summary.interviews.map((session) => (
          <Link
            key={session.id}
            className="session-row-modern"
            to={session.completed ? `/summary/${session.id}` : "/interview"}
            state={session.completed ? undefined : { interviewId: session.id }}
          >
            <div className="session-main-modern">
              <strong>
                {session.type} - {session.difficulty}
              </strong>
              <div className="session-meta-modern">
                <span><Clock3 size={14} /> {new Date(session.created_at).toLocaleDateString()}</span>
                <span>
                  {session.completed ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}
                  {session.status}
                </span>
              </div>
            </div>

            <div className="session-score-block-modern">
              <div className="session-score-modern">
                {session.total_score ? session.total_score.toFixed(1) : "In Progress"}
              </div>
              <span className="session-open-modern">
                Open <ArrowUpRight size={14} />
              </span>
            </div>
          </Link>
        ))}

        {!summary.interviews.length && <p className="hint-modern">No interviews yet. Start one from the Home page.</p>}
      </div>
    </div>
  );
}

export default Dashboard;
