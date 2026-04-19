import React, { useEffect, useState } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { updateProfile } from "../services/api";
import { updateStoredUser } from "../services/auth";

function Settings() {
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
        <span className="section-badge-modern">Preferences</span>
        <h1>Settings</h1>
        <p>Manage your account and application preferences.</p>
      </div>

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <h4>Profile</h4>
          <div className="stat-value-modern">{name ? name.split(" ")[0] : "User"}</div>
          <span className="stat-label-modern">Display name on this device</span>
        </div>

        <div className="stat-card-modern">
          <h4>Sessions Created</h4>
          <div className="stat-value-modern">{user?.interviews_used || 0}</div>
          <span className="stat-label-modern">Interviews tracked on this account</span>
        </div>
      </div>

      <div className="card-modern settings-card-enhanced-modern">
        <div className="settings-card-header-modern">
          <div>
            <span className="section-badge-modern muted">Account</span>
            <h3>Your saved profile</h3>
          </div>
        </div>

        <div className="settings-row-modern">
          <div>
            <label className="label-modern">Display Name</label>
            <p className="hint-modern">Your local profile name</p>
          </div>
          <div className="settings-input-inline-modern">
            <UserRound size={16} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-modern"
              style={{ maxWidth: "220px" }}
            />
          </div>
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
          <div className="settings-input-inline-modern">
            <KeyRound size={16} />
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
      </div>

      {/* <div className="card-modern"> */}
        {/* <h3>Preferences</h3> */}

        <div className="settings-row-modern">
          {/* <div>
            <label className="label-modern">Push Notifications</label>
            <p className="hint-modern">Reminders for updates</p>
          </div> */}
          {/* <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          /> */}
        </div>

        {/* <div className="settings-row-modern">
          <div>
            <label className="label-modern">Email Digests</label>
            <p className="hint-modern">Weekly performance summaries</p>
          </div>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
          />
        </div> */}
      {/* </div> */}

      {statusMessage && <div className="card-modern status-card-modern"><p className="hint-modern">{statusMessage}</p></div>}

      <button className="btn-primary-modern" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : <>Save Changes <Save size={16} /></>}
      </button>
    </div>
  );
}

export default Settings;
