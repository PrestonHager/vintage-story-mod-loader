import { useState } from "react";
import { importModPack, applyModPack } from "../services/modpack";
import { getSettings } from "../services/storage";
import { invoke } from "@tauri-apps/api/core";
import type { ModPack } from "../types/mod";

export default function ModPackImporter() {
  const [modPack, setModPack] = useState<ModPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  async function handleImport() {
    try {
      setLoading(true);
      console.log("Import button clicked");
      const pack = await importModPack();
      if (pack) {
        setModPack(pack);
        alert(`Successfully imported mod pack: ${pack.name}`);
      } else {
        // User cancelled - no need to show error
        console.log("Import cancelled by user");
      }
    } catch (error) {
      console.error("Failed to import mod pack:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to import mod pack: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!modPack) return;

    try {
      setApplying(true);
      const settings = await getSettings();
      const modsPath = settings.mods_path || await invoke<string>("get_vintage_story_path");
      await applyModPack(modPack, modsPath);
      alert("Mod pack applied successfully!");
    } catch (error) {
      console.error("Failed to apply mod pack:", error);
      alert(`Failed to apply mod pack: ${error}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Import Mod Pack</h2>
        <button onClick={handleImport} disabled={loading}>
          {loading ? "Importing..." : "Import Mod Pack JSON"}
        </button>
      </div>

      {modPack && (
        <div className="card">
          <h3>{modPack.name}</h3>
          <p><strong>Version:</strong> {modPack.version}</p>
          <p><strong>Description:</strong> {modPack.description}</p>
          <p><strong>Mods:</strong> {modPack.mods.length}</p>
          <ul>
            {modPack.mods.map((mod, idx) => (
              <li key={idx}>{mod.id} ({mod.version})</li>
            ))}
          </ul>
          <button onClick={handleApply} disabled={applying} style={{ marginTop: "1rem" }}>
            {applying ? "Applying..." : "Apply Mod Pack"}
          </button>
        </div>
      )}
    </div>
  );
}

