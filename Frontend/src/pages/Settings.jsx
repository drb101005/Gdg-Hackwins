import React, { useState, useEffect } from 'react';

function Settings() {
  // 1. Initialize State
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => {
     const saved = localStorage.getItem('ace_theme');
     return saved ? JSON.parse(saved) : true;
  });

  // 2. THE FIX: Update CSS Variables for Global Theme Switching
  useEffect(() => {
    const root = document.documentElement;
    
    if (!darkMode) {
      // ☀️ LIGHT MODE: Override variables
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc'); 
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-glass', 'rgba(0, 0, 0, 0.03)');
      root.style.setProperty('--text-primary', '#0f172a'); 
      root.style.setProperty('--text-secondary', '#475569'); 
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', '#e2e8f0'); 
    } else {
      // 🌙 DARK MODE: Reset to defaults
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--bg-secondary');
      root.style.removeProperty('--bg-card');
      root.style.removeProperty('--bg-glass');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--text-muted');
      root.style.removeProperty('--border-color');
    }
    
    localStorage.setItem('ace_theme', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleSave = () => {
    // Optional: Visual feedback
    const btn = document.querySelector('.save-btn');
    if(btn) {
       const originalText = btn.textContent;
       btn.textContent = "Saved!";
       btn.style.backgroundColor = "var(--accent-green)";
       setTimeout(() => {
         btn.textContent = originalText;
         btn.style.backgroundColor = "";
       }, 2000);
    }
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and app preferences</p>
      </header>

      <div className="settings-content">
        
        {/* --- NEW SECTION: Account & Profile --- */}
        <div className="settings-section card-glass">
          <h3 className="settings-title">Account & Profile</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Display Name</label>
              <p className="setting-description">Your public profile name</p>
            </div>
            <input 
              type="text" 
              defaultValue="Demo User" 
              className="form-input" 
              style={{ width: '200px', textAlign: 'right' }} 
            />
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Email Address</label>
              <p className="setting-description">Contact email for notifications</p>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>user@example.com</span>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Current Plan</label>
              <p className="setting-description">You are currently on the Free tier</p>
            </div>
            <span className="hero-badge" style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
              Free Plan
            </span>
          </div>
        </div>

        {/* --- App Preferences --- */}
        <div className="settings-section card-glass">
          <h3 className="settings-title">App Preferences</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Dark Mode</label>
              <p className="setting-description">Toggle between dark and light themes</p>
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
              <label className="setting-label">Email Digests</label>
              <p className="setting-description">Receive weekly performance summaries</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button className="btn btn-glow save-btn" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default Settings;