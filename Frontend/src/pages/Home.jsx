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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  // --- UPDATED START LOGIC ---
    const handleStart = () => {
    let topic = "General Interview";
    
    // Topic Logic
    if (activeTab === 'job') {
      if (jobTitle) topic = jobTitle;
      else if (jobDescription) topic = "Technical Interview based on Job Description"; 
      else if (targetCompany) topic = `${targetCompany} Interview`;
    } else if (activeTab === 'resume' && fileName) {
      topic = fileName; // Use filename for keyword matching
    } else {
      topic = "Resume Based Interview";
    }

    // ⚡ CRITICAL: Save Language & Voice to Storage so Interview.jsx can read it
    localStorage.setItem('ace_lang', language);
    localStorage.setItem('ace_voice', voiceType);

    navigate('/interview', { state: { topic: topic } });
  };

  return (
    <div className="home-page premium-bg">
      {/* HERO HEADER */}
      <section className="home-hero">
        <div className="hero-glow" />
        <h1 className="home-title">Ace.Ai</h1>
        <p className="home-subtitle">
          Train your voice, Test your clarity, Get brutally honest feedback.
        </p>
      </section>

      {/* MAIN CONTENT */}
      <div className="home-content">
        {/* INPUT CARD */}
        <div className="premium-card">
          <div className="input-tabs premium-tabs">
            <button
              className={`input-tab ${activeTab === "resume" ? "active" : ""}`}
              onClick={() => setActiveTab("resume")}
            >
              📄 Resume Based
            </button>
            <button
              className={`input-tab ${activeTab === "job" ? "active" : ""}`}
              onClick={() => setActiveTab("job")}
            >
              💼 Job Description
            </button>
          </div>

          <div className="input-content">
            {activeTab === "resume" ? (
              <label className="drop-zone premium-drop">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />

                {!fileName ? (
                  <>
                    <div className="drop-icon">⬆️</div>
                    <p className="drop-title">Upload your resume</p>
                    <p className="drop-hint">
                      Drag & drop or click • PDF / DOCX
                    </p>
                  </>
                ) : (
                  <div className="file-confirm">
                    ✅ <span>{fileName}</span>
                  </div>
                )}
              </label>
            ) : (
              <div className="job-inputs">
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    placeholder="Senior Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Target Company</label>
                  <input
                    type="text"
                    placeholder="Google, Amazon, Meta"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Job Description</label>
                  <textarea
                    placeholder="Paste the job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONFIG CARD */}
        <div className="premium-card">
          <h3 className="section-title">Interview Configuration</h3>

          <div className="config-grid">
            <div className="config-item">
              <label>Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>

            <div className="config-item">
              <label>AI Voice</label>
              <div className="voice-toggle">
                <button
                  className={voiceType === "male" ? "active" : ""}
                  onClick={() => setVoiceType("male")}
                >
                  🎙️ Male
                </button>
                <button
                  className={voiceType === "female" ? "active" : ""}
                  onClick={() => setVoiceType("female")}
                >
                  🎙️ Female
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button className="start-interview-btn" onClick={handleStart}>
          ▶ Start Interview
        </button>
      </div>
    </div>
  );
}

export default Home;