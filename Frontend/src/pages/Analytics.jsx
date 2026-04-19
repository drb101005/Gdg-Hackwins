import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, Gauge, Layers3, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { getAnalyticsSummary } from "../services/api";

function Analytics() {
  const [summary, setSummary] = useState({
    averageScore: 0,
    totalSessions: 0,
    totalQuestions: 0,
    improvementPercent: 0,
    trend: [],
    interviews: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalyticsSummary()
      .then((response) => {
        setSummary({
          averageScore: Number(response?.averageScore || 0),
          totalSessions: Number(response?.totalSessions || 0),
          totalQuestions: Number(response?.totalQuestions || 0),
          improvementPercent: Number(response?.improvementPercent || 0),
          trend: Array.isArray(response?.trend) ? response.trend : [],
          interviews: Array.isArray(response?.interviews) ? response.interviews : [],
        });
      })
      .catch((err) => {
        setError(err?.message || "Unable to load analytics.");
      });
  }, []);

  const maxTrendScore = useMemo(() => {
    const values = summary.trend.map((item) => Number(item.score || 0));
    return Math.max(...values, 10);
  }, [summary.trend]);

  return (
    <div className="analytics-modern analytics-enhanced-modern">
      <div className="dashboard-header-modern">
        <div>
          <span className="section-badge-modern">Analytics</span>
          <h1>See how your interview performance is changing.</h1>
          <p>Track score movement, completed sessions, and whether your practice is actually compounding.</p>
        </div>

        <Link to="/home" className="btn-primary-modern">
          New Session
        </Link>
      </div>

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <h4>Average Score</h4>
          <div className="stat-value-modern">{summary.averageScore.toFixed(1)}</div>
          <span className="stat-label-modern">Across completed sessions</span>
        </div>

        <div className="stat-card-modern">
          <h4>Total Sessions</h4>
          <div className="stat-value-modern">{summary.totalSessions}</div>
          <span className="stat-label-modern">Finished interview rounds</span>
        </div>

        <div className="stat-card-modern">
          <h4>Questions Reviewed</h4>
          <div className="stat-value-modern">{summary.totalQuestions}</div>
          <span className="stat-label-modern">Across completed sessions</span>
        </div>

        <div className="stat-card-modern">
          <h4>Improvement</h4>
          <div className="stat-value-modern">{summary.improvementPercent.toFixed(0)}%</div>
          <span className="stat-label-modern">From first tracked completed session</span>
        </div>
      </div>

      <div className="analytics-insight-grid-modern">
        <div className="card-modern analytics-chart-card-modern">
          <div className="analytics-card-header-modern">
            <div>
              <span className="section-badge-modern muted">Trend</span>
              <h3>Recent score movement</h3>
            </div>
            <TrendingUp size={20} />
          </div>

          {summary.trend.length ? (
            <div className="trend-bars-modern">
              {summary.trend.map((item) => {
                const height = `${Math.max(18, (Number(item.score || 0) / maxTrendScore) * 100)}%`;
                return (
                  <div key={item.id} className="trend-bar-item-modern">
                    <div className="trend-bar-shell-modern">
                      <div className="trend-bar-fill-modern" style={{ height }} />
                    </div>
                    <strong>{Number(item.score || 0).toFixed(1)}</strong>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="hint-modern">Complete a few sessions to unlock trend comparisons.</p>
          )}
        </div>

        <div className="card-modern analytics-summary-card-modern">
          <div className="analytics-card-header-modern">
            <div>
              <span className="section-badge-modern muted">Snapshot</span>
              <h3>What this data is saying</h3>
            </div>
            <Gauge size={20} />
          </div>

          <div className="analytics-summary-list-modern">
            <div className="analytics-summary-item-modern">
              <BarChart3 size={18} />
              <div>
                <strong>Consistency matters</strong>
                <p>Progress becomes clearer once you finish multiple rounds instead of judging a single session.</p>
              </div>
            </div>
            <div className="analytics-summary-item-modern">
              <Layers3 size={18} />
              <div>
                <strong>Review across sessions</strong>
                <p>Use this page alongside summaries to compare how your answers changed over time, not just one round.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="error-text">{error}</div> : null}

      <div className="card-modern">
        <div className="sessions-header-modern">
          <div>
            <span className="section-badge-modern muted">Completed sessions</span>
            <h3>Review completed interviews</h3>
            <p className="hint-modern">Open any result to compare the detailed summary against the trend above.</p>
          </div>
        </div>

        <div className="sessions-modern">
          {summary.interviews.map((session) => (
            <Link key={session.id} to={`/summary/${session.id}`} className="session-row-modern">
              <div className="session-main-modern">
                <strong>{session.type} - {session.difficulty}</strong>
                <div className="session-meta-modern">
                  <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  <span>{session.question_count} questions</span>
                </div>
              </div>

              <div className="session-score-block-modern">
                <div className="session-score-modern">{Number(session.score || 0).toFixed(1)}</div>
                <span className="session-open-modern">Open <ArrowUpRight size={14} /></span>
              </div>
            </Link>
          ))}

          {!summary.interviews.length ? <p className="hint-modern">No completed interviews yet. Finish one to see analytics.</p> : null}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
