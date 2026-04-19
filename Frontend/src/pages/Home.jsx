import React, { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, Database, Mic, Sparkles } from "lucide-react";
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
      <div className="home-hero-modern">
        <div className="home-header">
          <span className="section-badge-modern">Session setup</span>
          <h1>Start a new session</h1>
          <p>
            Build a practice round with role context, targeted prompts, and locally saved recordings so your prep
            feels structured from the first question.
          </p>
        </div>

        <div className="home-hero-panel">
          <div className="home-hero-status">
            <span>Backend</span>
            <strong>{systemStatus.loading ? "Checking..." : systemStatus.backendReady ? "Ready" : "Offline"}</strong>
          </div>
          <div className="home-hero-status">
            <span>AI service</span>
            <strong>{systemStatus.loading ? "Checking..." : systemStatus.aiReady ? "Ready" : "Optional"}</strong>
          </div>
          <div className="home-hero-status">
            <span>Sessions created</span>
            <strong>{Number(user?.interviews_used || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="home-highlights-grid">
        <div className="card-modern home-highlight-card">
          <div className="home-highlight-icon">
            <BrainCircuit size={20} />
          </div>
          <h3>Sharper prompts</h3>
          <p className="hint-modern">Add resume and JD context to get questions that feel closer to a real panel.</p>
        </div>

        <div className="card-modern home-highlight-card">
          <div className="home-highlight-icon">
            <Mic size={20} />
          </div>
          <h3>Recorded locally</h3>
          <p className="hint-modern">Each answer is captured on-device so you can replay and review without cloud lock-in.</p>
        </div>

        <div className="card-modern home-highlight-card">
          <div className="home-highlight-icon">
            <Database size={20} />
          </div>
          <h3>Saved progress</h3>
          <p className="hint-modern">Your sessions, scoring, and context stay tied to the local app workflow.</p>
        </div>
      </div>

      <div className="card-modern system-status-card-modern">
        <div className="system-status-header-modern">
          <div>
            <span className="section-badge-modern muted">System status</span>
            <h3>Local services</h3>
          </div>
          <div className={`system-status-pill ${systemStatus.backendReady ? "healthy" : "warning"}`}>
            {systemStatus.backendReady ? "Ready to start" : "Attention needed"}
          </div>
        </div>
        <p className="hint-modern">
          {systemStatus.loading
            ? "Checking backend and optional AI services..."
            : systemStatus.message || "Backend status updated from local health checks."}
        </p>
        <div className="system-status-grid-modern">
          <div className="system-status-item-modern">
            <strong>Interview backend</strong>
            <span>{systemStatus.backendReady ? "Connected" : "Unavailable"}</span>
          </div>
          <div className="system-status-item-modern">
            <strong>AI generation</strong>
            <span>{systemStatus.aiReady ? "Connected" : "Fallback/local flow"}</span>
          </div>
        </div>
        {systemStatus.warnings.map((warning) => (
          <p key={warning} className="hint-modern">
            {warning}
          </p>
        ))}
      </div>

      <div className="card-modern">
        <div className="home-form-header-modern">
          <div>
            <span className="section-badge-modern muted">Configuration</span>
            <h3>Interview setup</h3>
          </div>
          <div className="setup-chip-row-modern">
            <span className="setup-chip-modern">Role-driven</span>
            <span className="setup-chip-modern">Timed rounds</span>
            <span className="setup-chip-modern">Local review</span>
          </div>
        </div>

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
        {isSubmitting ? "Preparing..." : <>Begin Session <ArrowRight size={16} /></>}
      </button>

      <div className="card-modern home-tip-card-modern">
        <div className="home-tip-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h3>Best results come from richer context</h3>
          <p className="hint-modern">
            Add concrete projects, ownership, and target-role expectations. The better the context, the more realistic
            the interview flow feels.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
