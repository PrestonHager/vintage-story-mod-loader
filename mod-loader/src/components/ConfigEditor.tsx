import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getSettings } from "../services/storage";
import type { Mod } from "../types/mod";

export default function ConfigEditor() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
  const [configFiles, setConfigFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [configContent, setConfigContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMods();
  }, []);

  useEffect(() => {
    if (selectedMod) {
      loadConfigFiles(selectedMod.path);
    }
  }, [selectedMod]);

  useEffect(() => {
    if (selectedFile && selectedMod) {
      loadConfigFile(selectedMod.path, selectedFile);
    }
  }, [selectedFile, selectedMod]);

  async function loadMods() {
    try {
      const settings = await getSettings();
      const path = settings.mods_path || await invoke<string>("get_vintage_story_path");
      const modList = await invoke<Mod[]>("get_mod_list", { modsPath: path, forceRefresh: false });
      setMods(modList);
    } catch (error) {
      console.error("Failed to load mods:", error);
    }
  }

  async function loadConfigFiles(modPath: string) {
    try {
      setLoading(true);
      // List JSON files in mod directory
      const files = await invoke<string[]>("list_config_files", { modPath });
      setConfigFiles(files);
    } catch (error) {
      console.error("Failed to load config files:", error);
      setConfigFiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadConfigFile(modPath: string, fileName: string) {
    try {
      setLoading(true);
      const content = await invoke<string>("read_config", { modPath, fileName });
      setConfigContent(content);
    } catch (error) {
      console.error("Failed to load config file:", error);
      setConfigContent("");
    } finally {
      setLoading(false);
    }
  }

  async function saveConfigFile() {
    if (!selectedMod || !selectedFile) {
      alert("Please select a mod and config file");
      return;
    }

    try {
      setLoading(true);
      await invoke("write_config", {
        modPath: selectedMod.path,
        fileName: selectedFile,
        content: configContent,
      });
      alert("Config file saved successfully!");
    } catch (error) {
      console.error("Failed to save config file:", error);
      alert(`Failed to save config file: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Configuration Editor</h2>
        <p>Browse and edit mod configuration files.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "1rem", marginTop: "1rem" }}>
        <div className="card">
          <h3>Mods</h3>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {mods.map((mod) => (
              <div
                key={mod.id}
                onClick={() => setSelectedMod(mod)}
                style={{
                  padding: "0.5rem",
                  cursor: "pointer",
                  backgroundColor: selectedMod?.id === mod.id ? "#3498db" : "transparent",
                  color: selectedMod?.id === mod.id ? "white" : "inherit",
                  borderRadius: "4px",
                  marginBottom: "0.25rem",
                }}
              >
                {mod.name}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Config Files</h3>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {configFiles.length === 0 ? (
                <div style={{ color: "#666" }}>No config files found</div>
              ) : (
                configFiles.map((file) => (
                  <div
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    style={{
                      padding: "0.5rem",
                      cursor: "pointer",
                      backgroundColor: selectedFile === file ? "#3498db" : "transparent",
                      color: selectedFile === file ? "white" : "inherit",
                      borderRadius: "4px",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {file}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Editor</h3>
          {selectedFile ? (
            <>
              <textarea
                value={configContent}
                onChange={(e) => setConfigContent(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "400px",
                  fontFamily: "monospace",
                  fontSize: "0.9rem",
                  marginTop: "1rem",
                }}
              />
              <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                <button onClick={saveConfigFile} disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    if (selectedMod && selectedFile) {
                      loadConfigFile(selectedMod.path, selectedFile);
                    }
                  }}
                  disabled={loading}
                >
                  Reload
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: "#666", padding: "2rem", textAlign: "center" }}>
              Select a mod and config file to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
