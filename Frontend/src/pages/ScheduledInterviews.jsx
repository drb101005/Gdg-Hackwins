import React, { useEffect, useState } from "react";
import { ArrowRight, Clock3, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listInterviews } from "../services/api";

function ScheduledInterviews() {
  const navigate = useNavigate();
  const [scheduled, setScheduled] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listInterviews()
      .then((response) => {
        const upcoming = response.interviews.filter((item) => !item.completed);
        setScheduled(upcoming);
      })
      .catch((err) => setError(err.message || "Unable to load interview history."));
  }, []);

  const handleStartSession = (session) => {
    navigate("/interview", { state: { interviewId: session.id } });
  };

  return (
    <div className="scheduled-modern">
      <div className="scheduled-header-modern">
        <span className="section-badge-modern">Active sessions</span>
        <h1>Active Interviews</h1>
        <p>Jump back into any in-progress interview without rebuilding the setup.</p>
      </div>

      <div className="card-modern scheduled-list-card-modern">
        <div className="sessions-header-modern">
          <div>
            <h3>Continue where you paused</h3>
            <p className="hint-modern">Each session keeps its question flow and current progress.</p>
          </div>
        </div>

        <div className="scheduled-list-modern">
          {scheduled.map((session) => (
            <div key={session.id} className="scheduled-item-modern">
              <div className="session-main-modern">
                <strong>{session.type} - {session.difficulty}</strong>
                <div className="session-meta-modern">
                  <span><Clock3 size={14} /> {new Date(session.created_at).toLocaleString()}</span>
                  <span>{session.status}</span>
                </div>
              </div>

              <button className="btn-secondary-modern" onClick={() => handleStartSession(session)}>
                <PlayCircle size={16} />
                Continue
              </button>
            </div>
          ))}
        </div>

        {!scheduled.length && (
          <div className="scheduled-empty-modern">
            <p className="hint-modern">No active interviews yet. Start one from the home page and it will show up here.</p>
            <button className="btn-primary-modern" onClick={() => navigate("/home")}>
              Start a session <ArrowRight size={16} />
            </button>
          </div>
        )}

        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}

export default ScheduledInterviews;
