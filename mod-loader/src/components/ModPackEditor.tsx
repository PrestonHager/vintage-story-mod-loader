import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { getSettings } from "../services/storage";
import type { ModPack } from "../types/mod";

const MOD_PACK_EDITOR_STORAGE_KEY = "vs-mod-loader-mod-pack-editor";

export default function ModPackEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Load from location state, localStorage, or default
  const loadInitialModPack = (): ModPack => {
    if (location.state?.modPack) {
      return location.state.modPack;
    }
    const stored = localStorage.getItem(MOD_PACK_EDITOR_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored mod pack:", e);
      }
    }
    return {
      name: "",
      version: "1.0.0",
      description: "",
      mods: [],
      metadata: {
        category: "Game Mod",
        tags: [],
        status: "Draft",
        side: "Client and Server side mod",
      },
    };
  };

  const [modPack, setModPack] = useState<ModPack>(loadInitialModPack());
  const [images, setImages] = useState<string[]>(modPack.metadata.screenshots || []);

  // Save to localStorage whenever modPack changes
  useEffect(() => {
    localStorage.setItem(MOD_PACK_EDITOR_STORAGE_KEY, JSON.stringify(modPack));
  }, [modPack]);

  // Update images when modPack metadata changes
  useEffect(() => {
    setImages(modPack.metadata.screenshots || []);
  }, [modPack.metadata.screenshots]);

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const settings = await getSettings();
      
      // First, save the mod pack to the packs directory
      const packPath = await invoke<string>("save_mod_pack_to_packs_dir", { pack: modPack });
      
      // Then submit to the mod database
      const response = await invoke<any>("submit_mod_pack", {
        modPack: modPack,
        username: settings.api_username,
        password: settings.api_password,
      });

      if (response.success) {
        // Clear stored mod pack on successful submission
        localStorage.removeItem(MOD_PACK_EDITOR_STORAGE_KEY);
        alert(response.message || "Mod pack saved and submitted successfully!");
        navigate("/mod-packs");
      } else {
        alert(`Submission failed: ${response.message || "Unknown error"}. Mod pack was saved locally at: ${packPath}`);
      }
    } catch (error) {
      console.error("Failed to submit mod pack:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to submit mod pack: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  }

  function addTag(tag: string) {
    if (tag && !modPack.metadata.tags?.includes(tag)) {
      setModPack(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          tags: [...(prev.metadata.tags || []), tag],
        },
      }));
    }
  }

  function removeTag(tag: string) {
    setModPack(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        tags: prev.metadata.tags?.filter(t => t !== tag) || [],
      },
    }));
  }

  return (
    <div>
      <div className="card">
        <h2>Edit Mod Pack Metadata</h2>
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>Status</label>
            <select
              value={modPack.metadata.status || "Draft"}
              onChange={(e) => setModPack(prev => ({
                ...prev,
                metadata: { ...prev.metadata, status: e.target.value as "Draft" | "Published" }
              }))}
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
          </div>

          <div>
            <label>Category</label>
            <select
              value={modPack.metadata.category || "Game Mod"}
              onChange={(e) => setModPack(prev => ({
                ...prev,
                metadata: { ...prev.metadata, category: e.target.value }
              }))}
            >
              <option value="Game Mod">Game Mod</option>
              <option value="Server-Specific Tweak">Server-Specific Tweak</option>
              <option value="External Tool">External Tool</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label>Tags</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              {modPack.metadata.tags?.map(tag => (
                <span
                  key={tag}
                  style={{
                    padding: "0.25rem 0.75rem",
                    backgroundColor: "#3498db",
                    color: "white",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "1rem",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tag and press Enter"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addTag(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
              style={{ marginTop: "0.5rem" }}
            />
          </div>

          <div>
            <label>Name</label>
            <input
              type="text"
              value={modPack.name}
              onChange={(e) => setModPack(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label>URL Alias</label>
            <input
              type="text"
              value={modPack.metadata.url_alias || ""}
              onChange={(e) => setModPack(prev => ({
                ...prev,
                metadata: { ...prev.metadata, url_alias: e.target.value }
              }))}
            />
          </div>

          <div>
            <label>Summary (100 characters max)</label>
            <input
              type="text"
              maxLength={100}
              value={modPack.metadata.summary || ""}
              onChange={(e) => setModPack(prev => ({
                ...prev,
                metadata: { ...prev.metadata, summary: e.target.value }
              }))}
            />
            <small style={{ color: "#666" }}>
              {(modPack.metadata.summary?.length || 0)}/100 characters
            </small>
          </div>

          <div>
            <label>Description</label>
            <textarea
              value={modPack.metadata.text || modPack.description}
              onChange={(e) => setModPack(prev => ({
                ...prev,
                description: e.target.value,
                metadata: { ...prev.metadata, text: e.target.value }
              }))}
              rows={10}
            />
          </div>

          <div>
            <label>Side</label>
            <select
              value={modPack.metadata.side || "Client and Server side mod"}
              onChange={(e) => setModPack(prev => ({
                ...prev,
                metadata: { ...prev.metadata, side: e.target.value as any }
              }))}
            >
              <option value="Client and Server side mod">Client and Server side mod</option>
              <option value="Server side only mod">Server side only mod</option>
              <option value="Client side only mod">Client side only mod</option>
            </select>
          </div>

          <div>
            <label>Links</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="text"
                placeholder="Homepage URL"
                value={modPack.metadata.links?.homepage || ""}
                onChange={(e) => setModPack(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    links: { ...prev.metadata.links, homepage: e.target.value }
                  }
                }))}
              />
              <input
                type="text"
                placeholder="Trailer Video URL"
                value={modPack.metadata.links?.trailer || ""}
                onChange={(e) => setModPack(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    links: { ...prev.metadata.links, trailer: e.target.value }
                  }
                }))}
              />
              <input
                type="text"
                placeholder="Source Code URL"
                value={modPack.metadata.links?.source || ""}
                onChange={(e) => setModPack(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    links: { ...prev.metadata.links, source: e.target.value }
                  }
                }))}
              />
              <input
                type="text"
                placeholder="Issue Tracker URL"
                value={modPack.metadata.links?.issues || ""}
                onChange={(e) => setModPack(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    links: { ...prev.metadata.links, issues: e.target.value }
                  }
                }))}
              />
              <input
                type="text"
                placeholder="Wiki URL"
                value={modPack.metadata.links?.wiki || ""}
                onChange={(e) => setModPack(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    links: { ...prev.metadata.links, wiki: e.target.value }
                  }
                }))}
              />
              <input
                type="text"
                placeholder="Donate URL"
                value={modPack.metadata.links?.donate || ""}
                onChange={(e) => setModPack(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    links: { ...prev.metadata.links, donate: e.target.value }
                  }
                }))}
              />
            </div>
          </div>

          <div>
            <label>Screenshots</label>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              Image upload functionality coming soon. For now, you can add image URLs.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={img}
                    onChange={(e) => {
                      const newImages = [...images];
                      newImages[idx] = e.target.value;
                      setImages(newImages);
                      setModPack(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, screenshots: newImages }
                      }));
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => {
                      const newImages = images.filter((_, i) => i !== idx);
                      setImages(newImages);
                      setModPack(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, screenshots: newImages }
                      }));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setImages([...images, ""]);
                }}
              >
                Add Screenshot URL
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={() => navigate("/packs")}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Mod Pack"}
          </button>
        </div>
      </div>
    </div>
  );
}
