import { useState, useEffect } from "react";
import { getSettings, saveSettings, type Settings as SettingsType } from "../services/storage";
import { invoke } from "@tauri-apps/api/core";

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>({
    theme: "light",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const currentSettings = await getSettings();
      setSettings(currentSettings);

      // Auto-detect Vintage Story path if not set
      if (!currentSettings.mods_path) {
        try {
          const vsPath = await invoke<string>("get_vintage_story_path");
          setSettings(prev => ({ ...prev, mods_path: vsPath }));
        } catch (error) {
          console.error("Failed to detect Vintage Story path:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await saveSettings(settings);
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert(`Failed to save settings: ${error}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card">Loading settings...</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>Settings</h2>
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>Vintage Story Mods Path</label>
            <input
              type="text"
              value={settings.mods_path || ""}
              onChange={(e) => setSettings(prev => ({ ...prev, mods_path: e.target.value }))}
              placeholder="Auto-detected path"
            />
            <button
              onClick={async () => {
                try {
                  const path = await invoke<string>("get_vintage_story_path");
                  setSettings(prev => ({ ...prev, mods_path: path }));
                } catch (error) {
                  alert(`Failed to detect path: ${error}`);
                }
              }}
              style={{ marginTop: "0.5rem" }}
            >
              Auto-detect
            </button>
          </div>

          <div>
            <label>API Username</label>
            <input
              type="text"
              value={settings.api_username || ""}
              onChange={(e) => setSettings(prev => ({ ...prev, api_username: e.target.value }))}
            />
          </div>

          <div>
            <label>API Password</label>
            <input
              type="password"
              value={settings.api_password || ""}
              onChange={(e) => setSettings(prev => ({ ...prev, api_password: e.target.value }))}
            />
          </div>

          <div>
            <label>Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

