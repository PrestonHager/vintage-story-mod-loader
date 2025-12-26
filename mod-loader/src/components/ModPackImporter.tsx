import { useState, useEffect, useRef } from "react";
import { importModPack, applyModPack } from "../services/modpack";
import { getSettings } from "../services/storage";
import { invoke } from "@tauri-apps/api/core";
import type { ModPack } from "../types/mod";
import { useToast } from "./Toast";
import { useModPackApplication } from "../contexts/ModPackApplicationContext";

export default function ModPackImporter() {
  const [modPack, setModPack] = useState<ModPack | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { progress, startApplication, updateProgress, cancelApplication, reset } = useModPackApplication();
  const abortControllerRef = useRef<AbortController | null>(null);

  async function handleImport() {
    try {
      setLoading(true);
      console.log("[Frontend] Import button clicked");
      console.log("[Frontend] Calling importModPack()...");
      
      const pack = await importModPack();
      
      console.log("[Frontend] importModPack() returned:", pack);
      
      if (pack) {
        console.log("[Frontend] Mod pack received:", {
          name: pack.name,
          version: pack.version,
          modsCount: pack.mods.length
        });
        setModPack(pack);
        showToast(`Successfully imported mod pack: ${pack.name}`, "success");
      } else {
        // User cancelled - no need to show error
        console.log("[Frontend] Import cancelled by user");
      }
    } catch (error) {
      console.error("[Frontend] Failed to import mod pack:", error);
      console.error("[Frontend] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to import mod pack: ${errorMessage}`, "error", 8000);
    } finally {
      setLoading(false);
      console.log("[Frontend] Import process finished, loading set to false");
    }
  }

  // Sync local modPack with context if it exists
  useEffect(() => {
    if (progress.modPack && !modPack) {
      setModPack(progress.modPack);
    }
  }, [progress.modPack, modPack]);

  async function handleApply() {
    if (!modPack) return;

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    try {
      startApplication(modPack);
      const settings = await getSettings();
      const modsPath = settings.mods_path || await invoke<string>("get_vintage_story_path");
      
      const result = await applyModPack(modPack, modsPath, {
        showToast,
        abortSignal: abortControllerRef.current.signal,
        onProgress: (currentIndex, total, currentModId) => {
          updateProgress({
            currentModIndex: currentIndex,
            totalMods: total,
            currentModId,
          });
        },
        onSuccess: (modId) => {
          updateProgress({
            success: progress.success + 1,
          });
        },
        onFailed: (modId, error) => {
          updateProgress({
            failed: progress.failed + 1,
          });
        },
        onSkipped: (modId) => {
          updateProgress({
            skipped: progress.skipped + 1,
          });
        },
      });

      if (abortControllerRef.current.signal.aborted) {
        showToast("Mod pack application cancelled", "warning");
      } else if (result.success > 0 || result.failed === 0) {
        showToast(`Mod pack applied successfully! ${result.success} mods processed.`, "success");
      } else {
        showToast(`Mod pack partially applied. ${result.success} succeeded, ${result.failed} failed.`, "warning", 8000);
      }
    } catch (error) {
      console.error("Failed to apply mod pack:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!abortControllerRef.current?.signal.aborted) {
        showToast(`Failed to apply mod pack: ${errorMessage}`, "error", 8000);
      }
    } finally {
      updateProgress({ isRunning: false });
      abortControllerRef.current = null;
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
          <button 
            onClick={handleApply} 
            disabled={progress.isRunning} 
            style={{ marginTop: "1rem" }}
          >
            {progress.isRunning ? "Applying..." : "Apply Mod Pack"}
          </button>
          {progress.isRunning && (
            <div style={{ marginTop: "1rem", padding: "12px", backgroundColor: "var(--bg-secondary, #f5f5f5)", borderRadius: "4px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
                Progress: {progress.currentModIndex} / {progress.totalMods} mods
              </p>
              {progress.currentModId && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary, #666)" }}>
                  Current: {progress.currentModId}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

