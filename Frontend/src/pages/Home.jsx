import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [activeTab, setActiveTab] = useState('resume');
  const [fileName, setFileName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [voiceType, setVoiceType] = useState('female');
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

  const languages = [
    { code: 'en', label: 'English 🇺🇸' },
    { code: 'fr', label: 'French 🇫🇷' },
    { code: 'de', label: 'German 🇩🇪' }
  ];

  return (
    <div className="home-page">
      <header className="page-header">
        <h1 className="page-title">Start Interview</h1>
        <p className="page-subtitle">Configure and begin your practice session</p>
      </header>

      <div className="home-content">
        <div className="input-zone card-glass">
          <div className="input-tabs">
            <button
              className={`input-tab ${activeTab === 'resume' ? 'active' : ''}`}
              onClick={() => setActiveTab('resume')}
            >
              📄 Resume Based
            </button>
            <button
              className={`input-tab ${activeTab === 'job' ? 'active' : ''}`}
              onClick={() => setActiveTab('job')}
            >
              💼 Job Description Based
            </button>
          </div>

          <div className="input-content">
            {activeTab === 'resume' ? (
              <label
                className="drop-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                />
                <div className="drop-zone-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                {fileName ? (
                  <div className="drop-zone-success">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22,4 12,14.01 9,11.01"/>
                    </svg>
                    <span>{fileName}</span>
                  </div>
                ) : (
                  <>
                    <p className="drop-zone-title">Drop your resume here</p>
                    <p className="drop-zone-hint">or click to browse • PDF, DOC, DOCX</p>
                  </>
                )}
              </label>
            ) : (
              <div className="job-inputs">
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Senior Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Company</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Google, Meta, Amazon"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Paste Job Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="config-section card-glass">
          <h3 className="config-title">Interview Configuration</h3>

          <div className="config-grid">
            <div className="config-item">
              <label className="form-label">Language</label>
              <select
                className="form-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="config-item">
              <label className="form-label">AI Voice</label>
              <div className="voice-toggle">
                <button
                  className={`voice-option ${voiceType === 'male' ? 'active' : ''}`}
                  onClick={() => setVoiceType('male')}
                >
                  🎙️ Male AI
                </button>
                <button
                  className={`voice-option ${voiceType === 'female' ? 'active' : ''}`}
                  onClick={() => setVoiceType('female')}
                >
                  🎙️ Female AI
                </button>
              </div>
            </div>
          </div>
        </div>

        <button className="btn btn-glow start-btn" onClick={handleStart}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          Start Interview
        </button>
      </div>
    </div>
  );
}

export default Home;