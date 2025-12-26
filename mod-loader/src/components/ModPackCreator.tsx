import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useNavigate } from "react-router-dom";
import type { Mod, ModPack } from "../types/mod";
import { getSettings } from "../services/storage";
import { exportModPack } from "../services/modpack";

export default function ModPackCreator() {
  const navigate = useNavigate();
  const [mods, setMods] = useState<Mod[]>([]);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [modPack, setModPack] = useState<Partial<ModPack>>({
    name: "",
    version: "1.0.0",
    description: "",
    mods: [],
    metadata: {},
  });

  useEffect(() => {
    loadMods();
  }, []);

  async function loadMods() {
    try {
      const settings = await getSettings();
      const path = settings.mods_path || await invoke<string>("get_vintage_story_path");
      const modList = await invoke<Mod[]>("get_mod_list", { modsPath: path });
      setMods(modList.filter(m => m.enabled));
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

  function updateModPackMods(selected: Set<string>) {
    const selectedModList = mods.filter(m => selected.has(m.id));
    setModPack(prev => ({
      ...prev,
      mods: selectedModList.map(m => ({ id: m.id, version: m.version })),
    }));
  }

  function handleNext() {
    // Navigate to editor with mod pack data
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
      alert(`Failed to export mod pack: ${error}`);
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
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {mods.map((mod) => (
            <div key={mod.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <input
                type="checkbox"
                checked={selectedMods.has(mod.id)}
                onChange={() => toggleModSelection(mod.id)}
              />
              <div style={{ flex: 1 }}>
                <strong>{mod.name}</strong> <span style={{ color: "#666" }}>({mod.version})</span>
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

