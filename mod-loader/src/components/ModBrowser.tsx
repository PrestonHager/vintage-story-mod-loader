import { useState, useEffect } from "react";
import { searchMods, downloadMod } from "../services/api";
import type { ModDatabaseMod } from "../types/mod";

export default function ModBrowser() {
  const [mods, setMods] = useState<ModDatabaseMod[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMods();
  }, [page, searchQuery]);

  async function loadMods() {
    try {
      setLoading(true);
      const result = await searchMods(searchQuery || undefined, page);
      setMods(result.mods);
    } catch (error) {
      console.error("Failed to load mods:", error);
      alert(`Failed to load mods: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(mod: ModDatabaseMod) {
    if (!mod.download_url) {
      alert("No download URL available for this mod");
      return;
    }

    try {
      setDownloading(prev => new Set(prev).add(mod.id));
      const { getSettings } = await import("../services/storage");
      const { invoke } = await import("@tauri-apps/api/tauri");
      const settings = await getSettings();
      const modsPath = settings.mods_path || await invoke<string>("get_vintage_story_path");
      await downloadMod(mod.id, mod.download_url, modsPath);
      alert(`Mod ${mod.name} installed successfully!`);
    } catch (error) {
      console.error("Failed to download mod:", error);
      alert(`Failed to download mod: ${error}`);
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(mod.id);
        return next;
      });
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Browse Mods</h2>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <input
            type="text"
            placeholder="Search mods..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{ flex: 1 }}
          />
          <button onClick={loadMods}>Search</button>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading mods...</div>
      ) : (
        <div>
          {mods.length === 0 ? (
            <div className="card">No mods found.</div>
          ) : (
            mods.map((mod) => (
              <div key={mod.id} className="card">
                <div style={{ display: "flex", gap: "1rem" }}>
                  {mod.thumbnail_url && (
                    <img
                      src={mod.thumbnail_url}
                      alt={mod.name}
                      style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "4px" }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <h3>{mod.name}</h3>
                    <p style={{ color: "#666", fontSize: "0.9rem" }}>
                      Version: {mod.version} | Author: {mod.author || "Unknown"}
                    </p>
                    {mod.description && (
                      <p style={{ marginTop: "0.5rem" }}>{mod.description}</p>
                    )}
                    {mod.tags.length > 0 && (
                      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {mod.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#ecf0f1",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownload(mod)}
                    disabled={!mod.download_url || downloading.has(mod.id)}
                  >
                    {downloading.has(mod.id) ? "Downloading..." : "Download"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={mods.length === 0}>
          Next
        </button>
      </div>
    </div>
  );
}

