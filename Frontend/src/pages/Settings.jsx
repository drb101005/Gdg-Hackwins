import React, { useState } from 'react';

function Settings() {
  const [language, setLanguage] = useState('en');
  const [voiceType, setVoiceType] = useState('female');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const languages = [
    { code: 'en', label: 'English 🇺🇸' },
    { code: 'fr', label: 'French 🇫🇷' },
    { code: 'de', label: 'German 🇩🇪' }
  ];

  const handleSave = () => {
    // Mock save
    alert('Settings saved successfully!');
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Customize your interview experience</p>
      </header>

      <div className="settings-content">
        <div className="settings-section card-glass">
          <h3 className="settings-title">Interview Preferences</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Default Language</label>
              <p className="setting-description">Select the language for your interview sessions</p>
            </div>
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

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">AI Voice</label>
              <p className="setting-description">Choose your preferred AI interviewer voice</p>
            </div>
            <div className="voice-toggle">
              <button
                className={`voice-option ${voiceType === 'male' ? 'active' : ''}`}
                onClick={() => setVoiceType('male')}
              >
                🎙️ Male
              </button>
              <button
                className={`voice-option ${voiceType === 'female' ? 'active' : ''}`}
                onClick={() => setVoiceType('female')}
              >
                🎙️ Female
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section card-glass">
          <h3 className="settings-title">App Preferences</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Push Notifications</label>
              <p className="setting-description">Get reminders for scheduled interviews</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Dark Mode</label>
              <p className="setting-description">Enable dark theme (recommended)</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section card-glass">
          <h3 className="settings-title">Account</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Email</label>
              <p className="setting-description">user@example.com</p>
            </div>
            <button className="btn btn-secondary">Change</button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Password</label>
              <p className="setting-description">Last changed 30 days ago</p>
            </div>
            <button className="btn btn-secondary">Update</button>
          </div>
        </div>

        <button className="btn btn-glow save-btn" onClick={handleSave}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default Settings;
