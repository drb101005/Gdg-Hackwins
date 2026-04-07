import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateProfile } from "../services/api";
import { updateStoredUser } from "../services/auth";

function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setName(user?.name || "");
    setApiKey(user?.api_key || "");
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await updateProfile({ name, apiKey });
      updateStoredUser(response.user);
      setStatusMessage("Settings saved successfully.");
    } catch (err) {
      setStatusMessage(err.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-modern">
      <div className="settings-header-modern">
        <h1>Settings</h1>
        <p>Manage your account and application preferences.</p>
      </div>

      <div className="card-modern">
        <h3>Account</h3>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Display Name</label>
            <p className="hint-modern">Your local profile name</p>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-modern"
            style={{ maxWidth: "220px" }}
          />
        </div>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Email Address</label>
            <p className="hint-modern">Contact email for this local account</p>
          </div>
          <span className="settings-static-modern">{user?.email || "user@example.com"}</span>
        </div>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Current Plan</label>
            <p className="hint-modern">Interviews created: {user?.interviews_used || 0}</p>
          </div>
          <span className="plan-badge-modern">Local Unlimited</span>
        </div>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">API Key</label>
            <p className="hint-modern">Optional. Keep this only if you want the FastAPI Groq-powered features.</p>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="input-modern"
            style={{ maxWidth: "260px" }}
            placeholder="Optional"
          />
        </div>
      </div>

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

      {statusMessage && <div className="hint-modern">{statusMessage}</div>}

      <button className="btn-primary-modern" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

export default Settings;
