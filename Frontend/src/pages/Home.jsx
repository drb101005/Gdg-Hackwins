import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createInterview, getSystemHealth } from "../services/api";
import { updateStoredUser } from "../services/auth";

function Home() {
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Fresher");
  const [interviewType, setInterviewType] = useState("technical");
  const [company, setCompany] = useState("");
  const [resumeData, setResumeData] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
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
        role,
        experienceLevel,
        interviewType,
        company,
        resumeData,
        jobDescription,
        focusAreas,
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
          Create a local interview session, store everything in MySQL, and save
          each recording directly on this machine.
        </p>
      </div>

      <div className="card-modern">
        <h3>Session History</h3>
        <p className="hint-modern">
          Total interviews created: <strong>{Number(user?.interviews_used || 0)}</strong>
        </p>
        {/* <p className="hint-modern">
          Start as many interview sessions as you need. Local STT handles transcript metrics directly from the saved WAV answers.
        </p> */}
      </div>

      {/* <div className="card-modern">
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
            ? "Optional AI service status pending."
            : systemStatus.aiReady
              ? "Optional FastAPI services are reachable."
              : "FastAPI is unavailable. Interview transcripts and metrics still run through the local STT pipeline."}
        </p>
        {systemStatus.warnings.map((warning) => (
          <p key={warning} className="hint-modern">
            {warning}
          </p>
        ))}
        <p className="hint-modern">
          When you provide resume or role context, interview creation now requires AI question generation to succeed.
        </p>
      </div> */}

      <div className="card-modern">
        <h3>Interview Setup</h3>

        <div className="settings-grid-modern">
          <div>
            <label className="label-modern">Role</label>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="input-modern"
              placeholder="Frontend Developer, SDE Intern, Backend Engineer..."
            />
          </div>

          <div>
            <label className="label-modern">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value)}
              className="input-modern"
            >
              <option value="Fresher">Fresher</option>
              <option value="1-3 years">1-3 years</option>
              <option value="3+ years">3+ years</option>
            </select>
          </div>
        </div>

        <div className="settings-grid-modern">
          <div>
            <label className="label-modern">Interview Type</label>
            <select
              value={interviewType}
              onChange={(event) => setInterviewType(event.target.value)}
              className="input-modern"
            >
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="behavioral">Behavioral</option>
            </select>
          </div>

          <div>
            <label className="label-modern">Company</label>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="input-modern"
              placeholder="Optional target company"
            />
          </div>
        </div>

        <label className="label-modern">
          Resume Data
          <span className="hint-modern">
            Include projects, skills, technologies, ownership, and decisions you want the interviewer to probe.
          </span>
        </label>
        <textarea
          value={resumeData}
          onChange={(event) => setResumeData(event.target.value)}
          className="textarea-modern"
          placeholder="Paste projects, tech stack, internships, impact, and implementation details..."
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

        <label className="label-modern">
          Focus Areas
          <span className="hint-modern">
            Optional. Example: DSA, projects, system design, debugging, API design.
          </span>
        </label>
        <input
          value={focusAreas}
          onChange={(event) => setFocusAreas(event.target.value)}
          className="input-modern"
          placeholder="DSA, projects, system design..."
        />
      </div>

      {error && <div className="error-text">{error}</div>}

      <button
        className="btn-primary-modern start-session-btn"
        onClick={handleStart}
        disabled={isSubmitting || !systemStatus.backendReady}
      >
        {isSubmitting ? "Preparing..." : "Begin Session"}
      </button>
    </div>
  );
}

export default Home;
