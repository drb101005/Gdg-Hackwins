import React, { useState } from "react";

function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  const handleSave = () => {
    // simple visual confirmation
    alert("Settings saved successfully.");
  };

  return (
    <div className="settings-modern">

      <div className="settings-header-modern">
        <h1>Settings</h1>
        <p>Manage your account and application preferences.</p>
      </div>

      {/* Account Section */}
      <div className="card-modern">
        <h3>Account</h3>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Display Name</label>
            <p className="hint-modern">Your public profile name</p>
          </div>
          <input
            type="text"
            defaultValue="Demo User"
            className="input-modern"
            style={{ maxWidth: "220px" }}
          />
        </div>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Email Address</label>
            <p className="hint-modern">Contact email for notifications</p>
          </div>
          <span className="settings-static-modern">
            user@example.com
          </span>
        </div>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Current Plan</label>
            <p className="hint-modern">You are currently on the Free tier</p>
          </div>
          <span className="plan-badge-modern">Free Plan</span>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="card-modern">
        <h3>Preferences</h3>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Push Notifications</label>
            <p className="hint-modern">Reminders for scheduled sessions</p>
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
        </div>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Email Digests</label>
            <p className="hint-modern">Weekly performance summaries</p>
          </div>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
          />
        </div>
      </div>

      <button className="btn-primary-modern">
        Save Changes
      </button>

    </div>
  );
}

export default Settings;
