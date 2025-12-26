import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Mod } from "../types/mod";
import { getSettings } from "../services/storage";

export default function ModList() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modsPath, setModsPath] = useState<string>("");

  useEffect(() => {
    loadMods();
  }, []);

  async function loadMods() {
    try {
      setLoading(true);
      const settings = await getSettings();
      const path = settings.mods_path || await invoke<string>("get_vintage_story_path");
      setModsPath(path);
      
      const modList = await invoke<Mod[]>("get_mod_list", { modsPath: path });
      setMods(modList);
    } catch (error) {
      console.error("Failed to load mods:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleModSelection(modId: string) {
    const newSelected = new Set(selectedMods);
    if (newSelected.has(modId)) {
      newSelected.delete(modId);
    } else {
      newSelected.add(modId);
    }
    setSelectedMods(newSelected);
  }

  function toggleSelectAll() {
    if (selectedMods.size === filteredMods.length) {
      setSelectedMods(new Set());
    } else {
      setSelectedMods(new Set(filteredMods.map(m => m.id)));
    }
  }

  async function enableSelectedMods() {
    try {
      const modIds = Array.from(selectedMods);
      await invoke("enable_mods", { modsPath: modsPath, modIds });
      await loadMods();
      setSelectedMods(new Set());
    } catch (error) {
      console.error("Failed to enable mods:", error);
      alert(`Failed to enable mods: ${error}`);
    }
  }

  async function disableSelectedMods() {
    try {
      const modIds = Array.from(selectedMods);
      await invoke("disable_mods", { modsPath: modsPath, modIds });
      await loadMods();
      setSelectedMods(new Set());
    } catch (error) {
      console.error("Failed to disable mods:", error);
      alert(`Failed to disable mods: ${error}`);
    }
  }

  const filteredMods = mods.filter(mod =>
    mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mod.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="card">Loading mods...</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>Installed Mods</h2>
        <div style={{ marginTop: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem", color: "#666" }}>
          <strong>Mods Path:</strong> {modsPath || "Not set"}
        </div>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Search mods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={loadMods}>Refresh</button>
          <button onClick={toggleSelectAll}>
            {selectedMods.size === filteredMods.length ? "Deselect All" : "Select All"}
          </button>
          <button
            onClick={enableSelectedMods}
            disabled={selectedMods.size === 0}
          >
            Enable Selected ({selectedMods.size})
          </button>
          <button
            onClick={disableSelectedMods}
            disabled={selectedMods.size === 0}
          >
            Disable Selected ({selectedMods.size})
          </button>
        </div>
      </div>

      <div>
        {filteredMods.length === 0 ? (
          <div className="card">
            <p>No mods found.</p>
            {modsPath && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
                Checked path: {modsPath}
              </p>
            )}
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
              Make sure your Vintage Story mods are installed in the Mods directory.
            </p>
          </div>
        ) : (
          filteredMods.map((mod) => (
            <div key={mod.id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <input
                  type="checkbox"
                  checked={selectedMods.has(mod.id)}
                  onChange={() => toggleModSelection(mod.id)}
                />
                <div style={{ flex: 1 }}>
                  <h3>{mod.name}</h3>
                  <p style={{ color: "#666", fontSize: "0.9rem" }}>
                    ID: {mod.id} | Version: {mod.version}
                  </p>
                  {mod.info?.description && (
                    <p style={{ marginTop: "0.5rem" }}>{mod.info.description}</p>
                  )}
                </div>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
                    backgroundColor: mod.enabled ? "#27ae60" : "#e74c3c",
                    color: "white",
                    fontSize: "0.875rem",
                  }}
                >
                  {mod.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

