import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Mod, ModStatus } from "../types/mod";
import { getSettings } from "../services/storage";
import { useToast } from "./Toast";

export default function ModList() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modsPath, setModsPath] = useState<string>("");
  const [modStatuses, setModStatuses] = useState<Map<string, ModStatus>>(new Map());
  const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    loadMods();
  }, []);

  async function loadMods() {
    try {
      setLoading(true);
      const settings = await getSettings();
      const path = settings.mods_path || await invoke<string>("get_vintage_story_path");
      setModsPath(path);
      
      const modList = await invoke<Mod[]>("get_mod_list", { modsPath: path, forceRefresh: true });
      setMods(modList);
      
      // Check status for all mods (don't block on errors)
      checkAllModStatuses(path).catch((error) => {
        console.error("Failed to check mod statuses:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(`Warning: Some mod status checks failed: ${errorMessage}`, "warning", 5000);
      });
    } catch (error) {
      console.error("Failed to load mods:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to load mods: ${errorMessage}`, "error", 6000);
    } finally {
      setLoading(false);
    }
  }

  async function checkAllModStatuses(path: string) {
    try {
      const statuses = await invoke<Record<string, ModStatus>>("check_all_mods_status", { modsPath: path });
      setModStatuses(new Map(Object.entries(statuses)));
    } catch (error) {
      console.error("Failed to check mod statuses:", error);
    }
  }

  async function handleUpdateMod(modId: string) {
    try {
      setCheckingStatus(prev => new Set(prev).add(modId));
      await invoke("update_mod", { modId, modsPath: modsPath });
      showToast(`Updated ${modId} successfully`, "success");
      await loadMods();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to update ${modId}: ${errorMessage}`, "error");
    } finally {
      setCheckingStatus(prev => {
        const next = new Set(prev);
        next.delete(modId);
        return next;
      });
    }
  }

  async function handleInstallDependencies(modId: string) {
    try {
      setCheckingStatus(prev => new Set(prev).add(modId));
      const installed = await invoke<string[]>("install_dependencies", { modId, modsPath: modsPath });
      showToast(`Installed ${installed.length} dependency/dependencies for ${modId}`, "success");
      await loadMods();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to install dependencies for ${modId}: ${errorMessage}`, "error");
    } finally {
      setCheckingStatus(prev => {
        const next = new Set(prev);
        next.delete(modId);
        return next;
      });
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
      showToast(`Enabled ${modIds.length} mod(s)`, "success");
    } catch (error) {
      console.error("Failed to enable mods:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to enable mods: ${errorMessage}`, "error");
    }
  }

  async function disableSelectedMods() {
    try {
      const modIds = Array.from(selectedMods);
      await invoke("disable_mods", { modsPath: modsPath, modIds });
      await loadMods();
      setSelectedMods(new Set());
      showToast(`Disabled ${modIds.length} mod(s)`, "success");
    } catch (error) {
      console.error("Failed to disable mods:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to disable mods: ${errorMessage}`, "error");
    }
  }

  async function deleteSelectedMods() {
    const modIds = Array.from(selectedMods);
    const modNames = mods
      .filter(m => modIds.includes(m.id))
      .map(m => m.name)
      .join(", ");
    
    const count = modIds.length;
    const message = count === 1
      ? `Are you sure you want to permanently delete "${modNames}"?\n\nThis action cannot be undone. Consider disabling the mod instead.`
      : `Are you sure you want to permanently delete ${count} mods?\n\nMods: ${modNames}\n\nThis action cannot be undone. Consider disabling the mods instead.`;
    
    if (!window.confirm(message)) {
      return;
    }
    
    try {
      await invoke("delete_mods", { modsPath: modsPath, modIds });
      await loadMods();
      setSelectedMods(new Set());
      showToast(`Deleted ${count} mod(s)`, "success");
    } catch (error) {
      console.error("Failed to delete mods:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to delete mods: ${errorMessage}`, "error");
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
          <button
            onClick={deleteSelectedMods}
            disabled={selectedMods.size === 0}
            style={{
              backgroundColor: "#e74c3c",
              color: "white",
            }}
          >
            Delete Selected ({selectedMods.size})
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
          filteredMods.map((mod) => {
            const status = modStatuses.get(mod.id);
            const hasUpdate = status?.hasUpdate || false;
            const hasMissingDeps = status?.missingDependencies && status.missingDependencies.length > 0;
            const hasOutdatedDeps = status?.outdatedDependencies && status.outdatedDependencies.length > 0;
            const needsAction = hasUpdate || hasMissingDeps || hasOutdatedDeps;
            const isChecking = checkingStatus.has(mod.id);
            
            return (
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
                      {status?.latestVersion && status.latestVersion !== mod.version && (
                        <span style={{ color: "#f39c12", marginLeft: "0.5rem" }}>
                          (Latest: {status.latestVersion})
                        </span>
                      )}
                    </p>
                    {mod.info?.description && (
                      <p style={{ marginTop: "0.5rem" }}>{mod.info.description}</p>
                    )}
                    {hasMissingDeps && (
                      <p style={{ marginTop: "0.5rem", color: "#e74c3c", fontSize: "0.875rem" }}>
                        Missing dependencies: {status!.missingDependencies.map((d: { modid: string }) => d.modid).join(", ")}
                      </p>
                    )}
                    {hasOutdatedDeps && (
                      <p style={{ marginTop: "0.5rem", color: "#f39c12", fontSize: "0.875rem" }}>
                        Outdated dependencies: {status!.outdatedDependencies.map((d: { modid: string; installed: string; required: string }) => `${d.modid} (${d.installed} → ${d.required})`).join(", ")}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
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
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleUpdateMod(mod.id)}
                        disabled={!hasUpdate || isChecking}
                        style={{
                          padding: "0.25rem 0.75rem",
                          fontSize: "0.875rem",
                          backgroundColor: hasUpdate ? "#3498db" : "#95a5a6",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: hasUpdate && !isChecking ? "pointer" : "not-allowed",
                        }}
                        title={hasUpdate ? `Update to ${status?.latestVersion || "latest version"}` : "Already up to date"}
                      >
                        {isChecking ? "Updating..." : "Update"}
                      </button>
                      <button
                        onClick={() => handleInstallDependencies(mod.id)}
                        disabled={!needsAction || isChecking}
                        style={{
                          padding: "0.25rem 0.75rem",
                          fontSize: "0.875rem",
                          backgroundColor: needsAction ? "#9b59b6" : "#95a5a6",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: needsAction && !isChecking ? "pointer" : "not-allowed",
                        }}
                        title={needsAction ? "Install missing or update outdated dependencies" : "All dependencies satisfied"}
                      >
                        {isChecking ? "Installing..." : "Install Deps"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

