import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [activeTab, setActiveTab] = useState("resume");
  const [fileName, setFileName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [voiceType, setVoiceType] = useState("female");

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleStart = () => {
    let topic = "General Interview";

    if (activeTab === "job") {
      if (jobTitle) topic = jobTitle;
      else if (jobDescription) topic = "Role-based Interview";
      else if (targetCompany) topic = `${targetCompany} Interview`;
    } else if (activeTab === "resume" && fileName) {
      topic = fileName;
    } else {
      topic = "Resume-Based Interview";
    }

    localStorage.setItem("ace_lang", language);
    localStorage.setItem("ace_voice", voiceType);

    navigate("/interview", { state: { topic } });
  };

  return (
    <div className="home-modern">

      {/* HEADER */}
      <div className="home-header">
        <h1>Start a new session</h1>
        <p>
          Choose how you want to practice. You can base the session on your
          resume or target a specific role.
        </p>
      </div>

      {/* MODE SWITCH */}
      <div className="mode-switch">
        <button
          className={activeTab === "resume" ? "active" : ""}
          onClick={() => setActiveTab("resume")}
        >
          Resume Mode
        </button>
        <button
          className={activeTab === "job" ? "active" : ""}
          onClick={() => setActiveTab("job")}
        >
          Job Description Mode
        </button>
      </div>

      {/* INPUT CARD */}
      <div className="card-modern">

        {activeTab === "resume" ? (
          <>
            <label className="label-modern">
              Upload your resume
              <span className="hint-modern">
                PDF or DOCX — we’ll generate tailored questions from it.
              </span>
            </label>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="input-modern"
            />

            {fileName && (
              <p className="file-confirm-modern">
                Resume loaded: {fileName}
              </p>
            )}
          </>
        ) : (
          <>
            <label className="label-modern">
              Job Title
              <span className="hint-modern">
                The role you're preparing for.
              </span>
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="input-modern"
              placeholder="Frontend Developer"
            />

            <label className="label-modern">
              Target Company
            </label>
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              className="input-modern"
              placeholder="Optional"
            />

            <label className="label-modern">
              Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="textarea-modern"
              placeholder="Paste the job description here..."
            />
          </>
        )}
      </div>

      {/* SETTINGS CARD */}
      <div className="card-modern">

        <h3>Session Settings</h3>

        <div className="settings-grid-modern">

          <div>
            <label className="label-modern">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-modern"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div>
            <label className="label-modern">Interviewer Tone</label>
            <div className="voice-toggle-modern">
              <button
                className={voiceType === "male" ? "active" : ""}
                onClick={() => setVoiceType("male")}
              >
                Male
              </button>
              <button
                className={voiceType === "female" ? "active" : ""}
                onClick={() => setVoiceType("female")}
              >
                Female
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* CTA */}
      <button className="btn-primary-modern start-session-btn" onClick={handleStart}>
        Begin Session
      </button>

    </div>
  );
}

export default Home;
