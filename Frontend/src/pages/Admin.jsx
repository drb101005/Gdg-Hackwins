import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import WavAudioPlayer from "../components/WavAudioPlayer";
import VideoPlayer from "../components/VideoPlayer";
import { getAdminOverview, reprocessInterviews } from "../services/api";
import { useAuth } from "../hooks/useAuth";

function Admin() {
  const { user } = useAuth();
  const [overview, setOverview] = useState({ users: [], interviews: [], answers: [] });
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [reprocessing, setReprocessing] = useState(false);

  const loadOverview = () =>
    getAdminOverview()
      .then((response) => setOverview(response))
      .catch((err) => setError(err.message || "Unable to load admin panel."));

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }

    loadOverview();
  }, [user?.role]);

  const counts = useMemo(
    () => ({
      users: overview.users.length,
      interviews: overview.interviews.length,
      answers: overview.answers.length,
    }),
    [overview],
  );

  if (user?.role !== "admin") {
    return (
      <div className="settings-modern">
        <div className="card-modern">
          <h1>Admin Panel</h1>
          <p className="hint-modern">This section is only available to the local admin account.</p>
        </div>
      </div>
    );
  }

  const handleReprocess = async () => {
    setError("");
    setStatusMessage("");
    setReprocessing(true);

    try {
      const response = await reprocessInterviews();
      setStatusMessage(
        `Reprocessed ${response.processed_answers || 0} answers across ${response.updated_interviews || 0} interviews.`,
      );
      await loadOverview();
    } catch (err) {
      setError(err.message || "Unable to reprocess interviews.");
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="dashboard-modern">
      <div className="dashboard-header-modern">
        <div>
          <h1>Admin Panel</h1>
          <p>Inspect users, open interviews, and review transcripts or media from the local demo environment.</p>
        </div>
        <button className="btn-primary-modern" onClick={handleReprocess} disabled={reprocessing}>
          {reprocessing ? "Reprocessing..." : "Reprocess Interviews"}
        </button>
      </div>

      {error ? <div className="error-text">{error}</div> : null}
      {statusMessage ? <div className="hint-modern">{statusMessage}</div> : null}

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <h4>Users</h4>
          <div className="stat-value-modern">{counts.users}</div>
        </div>
        <div className="stat-card-modern">
          <h4>Interviews</h4>
          <div className="stat-value-modern">{counts.interviews}</div>
        </div>
        <div className="stat-card-modern">
          <h4>Answers</h4>
          <div className="stat-value-modern">{counts.answers}</div>
        </div>
      </div>

      <div className="card-modern">
        <h3>Users</h3>
        {overview.users.length ? (
          overview.users.map((item) => (
            <div key={item.id} className="session-row-modern">
              <div>
                <strong>{item.email}</strong>
                <div className="session-meta-modern">
                  {item.role} / {item.interviews_used} interviews
                </div>
              </div>
              <div className="session-score-modern">{new Date(item.created_at).toLocaleDateString()}</div>
            </div>
          ))
        ) : (
          <p className="hint-modern">No users yet.</p>
        )}
      </div>

      <div className="card-modern">
        <h3>Interviews</h3>
        {overview.interviews.length ? (
          overview.interviews.map((item) => (
            <div key={item.id} className="session-row-modern">
              <div>
                <strong>{item.user_email}</strong>
                <div className="session-meta-modern">
                  {item.type} / {item.difficulty} / {item.status}
                </div>
              </div>
              <div className="admin-interview-actions-modern">
                <div className="session-score-modern">
                  {item.total_score ? Number(item.total_score).toFixed(1) : "Pending"}
                </div>
                <Link to={`/summary/${item.id}`} className="btn-secondary-modern">
                  Open Interview
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p className="hint-modern">No interviews yet.</p>
        )}
      </div>

      <div className="card-modern">
        <h3>Answers</h3>
        {overview.answers.length ? (
          overview.answers.map((item) => (
            <article key={item.id} className="card-modern result-card-modern">
              <div className="result-card-header-modern">
                <div>
                  <p className="hint-modern">Interview {item.interview_id}</p>
                  <h3>{item.question_text}</h3>
                </div>
                <div className="result-question-score-modern">{item.score ?? "Pending"}</div>
              </div>

              <div className="result-metrics-modern">
                <span className="metric-pill-modern">WPM: {item.wpm ?? "-"}</span>
                <span className="metric-pill-modern">Pauses: {item.pause_count ?? "-"}</span>
                <span className="metric-pill-modern">Fillers: {item.filler_count ?? "-"}</span>
              </div>

              <div className="results-section-grid-modern">
                <section className="result-section-modern">
                  <p className="interview-label-modern">Transcript</p>
                  <p>{item.transcript || "Transcript pending."}</p>
                </section>

                <section className="result-section-modern">
                  <p className="interview-label-modern">Feedback</p>
                  <p>{item.feedback || "Feedback pending."}</p>
                </section>
              </div>

              <WavAudioPlayer path={item.audio_path} label="Audio Recording" />

              {item.video_path ? (
                <VideoPlayer path={item.video_path} label="Video Recording" />
              ) : null}
            </article>
          ))
        ) : (
          <p className="hint-modern">No answers submitted yet.</p>
        )}
      </div>
    </div>
  );
}

export default Admin;
