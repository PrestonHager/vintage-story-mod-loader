import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import type { Mod, ModPack } from "../types/mod";
import { getSettings } from "../services/storage";
import { exportModPack } from "../services/modpack";

const MOD_PACK_CREATOR_STORAGE_KEY = "vs-mod-loader-mod-pack-creator";

export default function ModPackCreator() {
  const navigate = useNavigate();
  const [mods, setMods] = useState<Mod[]>([]);
  
  // Load from localStorage or default
  const loadInitialModPack = (): Partial<ModPack> => {
    const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed;
      } catch (e) {
        console.error("Failed to parse stored mod pack:", e);
      }
    }
    return {
      name: "",
      version: "1.0.0",
      description: "",
      mods: [],
      metadata: {},
    };
  };

  const [modPack, setModPack] = useState<Partial<ModPack>>(loadInitialModPack());
  
  // Load selected mods from stored modPack
  const loadInitialSelectedMods = (): Set<string> => {
    const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.mods && Array.isArray(parsed.mods)) {
          return new Set(parsed.mods.map((m: { id: string }) => m.id));
        }
      } catch (e) {
        console.error("Failed to parse stored mod pack:", e);
      }
    }
    return new Set();
  };

  const [selectedMods, setSelectedMods] = useState<Set<string>>(loadInitialSelectedMods());

  useEffect(() => {
    loadMods();
  }, []);

  // Save to localStorage whenever modPack changes
  useEffect(() => {
    localStorage.setItem(MOD_PACK_CREATOR_STORAGE_KEY, JSON.stringify(modPack));
  }, [modPack]);

  async function loadMods() {
    try {
      const settings = await getSettings();
      const path = settings.mods_path || await invoke<string>("get_vintage_story_path");
      // Only index once when loading mods for pack creation (force_refresh: false)
      const modList = await invoke<Mod[]>("get_mod_list", { modsPath: path, forceRefresh: false });
      setMods(modList); // Load all mods, not just enabled ones
    } catch (error) {
      console.error("Failed to load mods:", error);
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
    updateModPackMods(newSelected);
  }

  function selectAll() {
    const allModIds = new Set(mods.map(m => m.id));
    setSelectedMods(allModIds);
    updateModPackMods(allModIds);
  }

  function deselectAll() {
    const emptySet = new Set<string>();
    setSelectedMods(emptySet);
    updateModPackMods(emptySet);
  }

  function selectAllEnabled() {
    const enabledModIds = new Set(mods.filter(m => m.enabled).map(m => m.id));
    setSelectedMods(enabledModIds);
    updateModPackMods(enabledModIds);
  }

  function updateModPackMods(selected: Set<string>) {
    const selectedModList = mods.filter(m => selected.has(m.id));
    setModPack(prev => ({
      ...prev,
      mods: selectedModList.map(m => {
        // Get hash from mod if available (for zip mods)
        const hash = (m as any).hash;
        return {
          id: m.id,
          version: m.version,
          ...(hash ? { hash } : {}),
        };
      }),
    }));
  }

  function handleNext() {
    // Navigate to editor with mod pack data
    // Clear creator storage since we're moving to editor
    localStorage.removeItem(MOD_PACK_CREATOR_STORAGE_KEY);
    navigate("/packs/edit", { state: { modPack } });
  }

  async function handleExport() {
    if (!modPack.name || selectedMods.size === 0) {
      alert("Please provide a name and select at least one mod");
      return;
    }

    try {
      const fullPack: ModPack = {
        name: modPack.name!,
        version: modPack.version || "1.0.0",
        description: modPack.description || "",
        mods: modPack.mods || [],
        metadata: modPack.metadata || {},
      };
      await exportModPack(fullPack);
      alert("Mod pack exported successfully!");
    } catch (error) {
      console.error("Failed to export mod pack:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to export mod pack: ${errorMessage}`);
    }
  }

  async function handleSaveAndPublish() {
    if (!modPack.name || selectedMods.size === 0) {
      alert("Please provide a name and select at least one mod");
      return;
    }

    try {
      const fullPack: ModPack = {
        name: modPack.name!,
        version: modPack.version || "1.0.0",
        description: modPack.description || "",
        mods: modPack.mods || [],
        metadata: modPack.metadata || {},
      };
      
      // Save to packs directory
      await invoke<string>("save_mod_pack_to_packs_dir", { pack: fullPack });
      
      // Navigate to editor for publishing
      localStorage.removeItem(MOD_PACK_CREATOR_STORAGE_KEY);
      navigate("/packs/edit", { state: { modPack: fullPack } });
    } catch (error) {
      console.error("Failed to save mod pack:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to save mod pack: ${errorMessage}`);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Create Mod Pack</h2>
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>Mod Pack Name</label>
            <input
              type="text"
              value={modPack.name}
              onChange={(e) => setModPack(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter mod pack name"
            />
          </div>
          <div>
            <label>Version</label>
            <input
              type="text"
              value={modPack.version}
              onChange={(e) => setModPack(prev => ({ ...prev, version: e.target.value }))}
              placeholder="1.0.0"
            />
          </div>
          <div>
            <label>Description</label>
            <textarea
              value={modPack.description}
              onChange={(e) => setModPack(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter mod pack description"
              rows={4}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Select Mods ({selectedMods.size} selected)</h3>
        <div style={{ marginTop: "1rem", marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
          <button onClick={selectAll}>Select All</button>
          <button onClick={deselectAll}>Deselect All</button>
          <button onClick={selectAllEnabled}>Select All Enabled</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {mods.map((mod) => (
            <div key={mod.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                type="checkbox"
                checked={selectedMods.has(mod.id)}
                onChange={() => toggleModSelection(mod.id)}
              />
              <div style={{ flex: 1 }}>
                <strong>{mod.name}</strong> <span style={{ color: "#666" }}>({mod.version})</span>
                {mod.enabled && <span style={{ color: "#28a745", marginLeft: "0.5rem" }}>✓ Enabled</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleExport}
            disabled={!modPack.name || selectedMods.size === 0}
          >
            Export Mod Pack
          </button>
          <button
            onClick={handleSaveAndPublish}
            disabled={!modPack.name || selectedMods.size === 0}
          >
            Save & Publish
          </button>
          <button
            onClick={handleNext}
            disabled={!modPack.name || selectedMods.size === 0}
          >
            Next: Edit Metadata
          </button>
        </div>
      </div>
    </div>
  );
}

