import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getSettings } from "../services/storage";
import { useToast } from "./Toast";

export interface ModPackInfo {
  name: string;
  version: string;
  description: string;
  mod_count: number;
  path: string;
  enabled: boolean;
  mod_ids: string[];
}

export default function ModPacksList() {
  const [modPacks, setModPacks] = useState<ModPackInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modsPath, setModsPath] = useState<string>("");
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    loadModPacks();
  }, []);

  async function loadModPacks() {
    try {
      setLoading(true);
      const settings = await getSettings();
      const path = settings.mods_path || await invoke<string>("get_vintage_story_path");
      setModsPath(path);
      
      const packs = await invoke<ModPackInfo[]>("list_mod_packs");
      setModPacks(packs);
    } catch (error) {
      console.error("Failed to load mod packs:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to load mod packs: ${errorMessage}`, "error", 6000);
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePack(pack: ModPackInfo) {
    try {
      if (pack.enabled) {
        await invoke("disable_mod_pack", { packPath: pack.path, modsPath });
        showToast(`Disabled mod pack: ${pack.name}`, "success");
      } else {
        await invoke("enable_mod_pack", { packPath: pack.path, modsPath });
        showToast(`Enabled mod pack: ${pack.name}`, "success");
      }
      await loadModPacks(); // Reload to update state
    } catch (error) {
      console.error(`Failed to ${pack.enabled ? "disable" : "enable"} mod pack:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to ${pack.enabled ? "disable" : "enable"} mod pack: ${errorMessage}`, "error", 6000);
    }
  }

  function toggleExpand(packPath: string) {
    const newExpanded = new Set(expandedPacks);
    if (newExpanded.has(packPath)) {
      newExpanded.delete(packPath);
    } else {
      newExpanded.add(packPath);
    }
    setExpandedPacks(newExpanded);
  }

  if (loading) {
    return <div className="card">Loading mod packs...</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>Mod Packs</h2>
        <div style={{ marginTop: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem", color: "#666" }}>
          <strong>Mods Path:</strong> {modsPath || "Not set"}
        </div>
        <button onClick={loadModPacks} style={{ marginTop: "1rem" }}>
          Refresh
        </button>
      </div>

      {modPacks.length === 0 ? (
        <div className="card">
          <p>No mod packs found.</p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
            Create a mod pack in the "Create Pack" tab, or import one from the "Import Pack" tab.
          </p>
        </div>
      ) : (
        modPacks.map((pack) => (
          <div key={pack.path} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <h3>{pack.name}</h3>
                <p style={{ color: "#666", fontSize: "0.9rem" }}>
                  Version: {pack.version} | {pack.mod_count} mod{pack.mod_count !== 1 ? "s" : ""}
                </p>
                {pack.description && (
                  <p style={{ marginTop: "0.5rem" }}>{pack.description}</p>
                )}
                {expandedPacks.has(pack.path) && (
                  <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "var(--bg-secondary, #f5f5f5)", borderRadius: "4px" }}>
                    <strong>Mods in this pack:</strong>
                    <ul style={{ marginTop: "0.5rem", marginLeft: "1.5rem" }}>
                      {pack.mod_ids.map((modId) => (
                        <li key={modId}>{modId}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
                    backgroundColor: pack.enabled ? "#27ae60" : "#e74c3c",
                    color: "white",
                    fontSize: "0.875rem",
                  }}
                >
                  {pack.enabled ? "Enabled" : "Disabled"}
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => toggleExpand(pack.path)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    {expandedPacks.has(pack.path) ? "Hide Mods" : "Show Mods"}
                  </button>
                  <button
                    onClick={() => handleTogglePack(pack)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.875rem",
                      backgroundColor: pack.enabled ? "#dc3545" : "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {pack.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

