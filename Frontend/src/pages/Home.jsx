import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createInterview, getSystemHealth } from "../services/api";
import { updateStoredUser } from "../services/auth";

function Home() {
  const [interviewType, setInterviewType] = useState("Tech");
  const [difficulty, setDifficulty] = useState("Medium");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    loading: true,
    backendReady: false,
    aiReady: false,
    warnings: [],
    message: "",
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  const freeRemaining = useMemo(
    () => Math.max(0, 3 - Number(user?.interviews_used || 0)),
    [user],
  );
  const needsApiKey = freeRemaining === 0 && !user?.api_key;

  useEffect(() => {
    getSystemHealth()
      .then((response) => {
        const data = response?.data || {};
        setSystemStatus({
          loading: false,
          backendReady: data.database === "ok",
          aiReady: data.ai_service === "ok",
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
          message: response?.message || "",
        });
      })
      .catch((err) => {
        setSystemStatus({
          loading: false,
          backendReady: false,
          aiReady: false,
          warnings: [],
          message: err.message || "Unable to verify local services.",
        });
      });
  }, []);

  const handleStart = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await createInterview({
        type: interviewType,
        difficulty,
        resumeText,
        jobDescription,
      });

      if (response?.user) {
        updateStoredUser(response.user);
      }

      navigate("/interview", {
        state: {
          interviewId: response.interview.id,
        },
      });
    } catch (err) {
      setError(err.message || "Unable to start interview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="home-modern">
      <div className="home-header">
        <h1>Start a new session</h1>
        <p>
          Create a local interview session, store everything in SQLite, and save
          each recording directly on this machine.
        </p>
      </div>

      <div className="card-modern">
        <h3>Usage Gate</h3>
        <p className="hint-modern">
          Free local interviews remaining: <strong>{freeRemaining}</strong>
        </p>
        <p className="hint-modern">
          {freeRemaining > 0
            ? "You can create your first three interviews without an API key."
            : user?.api_key
              ? "API key detected. You can continue creating interviews."
              : "Add an API key in Settings to continue after the free limit."}
        </p>
      </div>

      <div className="card-modern">
        <h3>System Status</h3>
        <p className="hint-modern">
          {systemStatus.loading
            ? "Checking local backend and processing services..."
            : systemStatus.backendReady
              ? "Local backend is reachable."
              : systemStatus.message || "Local backend is unavailable."}
        </p>
        <p className="hint-modern">
          {systemStatus.loading
            ? "FastAPI status pending."
            : systemStatus.aiReady
              ? "FastAPI audio processing is reachable."
              : "FastAPI is unavailable. Interviews still run, but results will use a safe fallback response."}
        </p>
        {systemStatus.warnings.map((warning) => (
          <p key={warning} className="hint-modern">
            {warning}
          </p>
        ))}
      </div>

      <div className="card-modern">
        <h3>Interview Setup</h3>

        <div className="settings-grid-modern">
          <div>
            <label className="label-modern">Interview Type</label>
            <select
              value={interviewType}
              onChange={(event) => setInterviewType(event.target.value)}
              className="input-modern"
            >
              <option value="Tech">Tech</option>
              <option value="HR">HR</option>
            </select>
          </div>

          <div>
            <label className="label-modern">Difficulty</label>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="input-modern"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <label className="label-modern">
          Resume Input
          <span className="hint-modern">
            Used for the 2 intro questions, 3 resume-based questions, and the
            core question set.
          </span>
        </label>
        <textarea
          value={resumeText}
          onChange={(event) => setResumeText(event.target.value)}
          className="textarea-modern"
          placeholder="Paste your resume summary, projects, internships, or achievements..."
        />

        <label className="label-modern">
          Job Description
          <span className="hint-modern">
            Paste the role details you want the backend to use as context.
          </span>
        </label>
        <textarea
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          className="textarea-modern"
          placeholder="Paste the job description or role requirements here..."
        />
      </div>

      {error && <div className="error-text">{error}</div>}

      <button
        className="btn-primary-modern start-session-btn"
        onClick={handleStart}
        disabled={isSubmitting || needsApiKey || !systemStatus.backendReady}
      >
        {isSubmitting
          ? "Preparing..."
          : needsApiKey
            ? "Add API Key in Settings"
            : "Begin Session"}
      </button>
    </div>
  );
}

export default Home;
